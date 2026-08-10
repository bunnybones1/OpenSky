// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::Write;

use std::fs::File;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use design_data_loader::{
    filesystem_to_json, get_fs_entries_of_folder_recursive, store_dir, FSEntry,
};
use notify::event::{ModifyKind, RenameMode};
use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::api::shell;
use tauri::{CustomMenuItem, Manager, Menu, MenuEntry, MenuItem, State, Submenu};
use walkdir::WalkDir;

struct DataLoadStatus {
    is_loading: Arc<Mutex<bool>>,
}

#[derive(Debug, PartialEq, Eq, Clone, Serialize)]
pub struct NormalizedFSEntry {
    path: String, // slash-sep!
    contents: Option<String>,
}

impl From<FSEntry> for NormalizedFSEntry {
    fn from(entry: FSEntry) -> Self {
        let path_with_foward_slash_seps = entry
            .path()
            .to_string_lossy()
            .to_string()
            .replace(std::path::MAIN_SEPARATOR, "/");
        NormalizedFSEntry {
            path: path_with_foward_slash_seps,
            contents: entry.contents().clone(),
        }
    }
}

impl std::fmt::Display for NormalizedFSEntry {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if let Some(c) = &self.contents {
            write!(f, "{}: edit file {}", self.path, c)
        } else {
            write!(f, "{}: delete", self.path)
        }
    }
}

fn main() {
    // Take the whole process down when a thread crashes.
    let default_panic = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        default_panic(info);
        std::process::exit(1);
    }));

    let ctx = tauri::generate_context!();
    tauri::Builder::default()
        .menu(Menu::with_items([
            #[cfg(target_os = "macos")]
            MenuEntry::Submenu(Submenu::new(
                &ctx.package_info().name,
                Menu::with_items([
                    MenuItem::About(
                        ctx.package_info().name.clone(),
                        tauri::AboutMetadata::default(),
                    )
                    .into(),
                    MenuItem::Separator.into(),
                    MenuItem::Services.into(),
                    MenuItem::Separator.into(),
                    MenuItem::Hide.into(),
                    MenuItem::HideOthers.into(),
                    MenuItem::ShowAll.into(),
                    MenuItem::Separator.into(),
                    MenuItem::Quit.into(),
                ]),
            )),
            MenuEntry::Submenu(Submenu::new(
                "File",
                Menu::with_items([
                    CustomMenuItem::new("closetab", "Close Tab")
                        .accelerator("cmdOrControl+W")
                        .into(),
                    MenuItem::CloseWindow.into(),
                ]),
            )),
            MenuEntry::Submenu(Submenu::new(
                "Edit",
                Menu::with_items([
                    MenuItem::Undo.into(),
                    MenuItem::Redo.into(),
                    // CustomMenuItem::new("undo", "Undo")
                    //     .accelerator("cmdOrControl+Z")
                    //     .into(),
                    // CustomMenuItem::new("redo", "Redo")
                    //     .accelerator("cmdOrControl+shift+Z")
                    //     .into(),
                    MenuItem::Separator.into(),
                    MenuItem::Cut.into(),
                    MenuItem::Copy.into(),
                    MenuItem::Paste.into(),
                    #[cfg(not(target_os = "macos"))]
                    MenuItem::Separator.into(),
                    MenuItem::SelectAll.into(),
                    MenuItem::Separator.into(),
                    // Windows doesn't take ctrl-f because of webview2 catching it, i can't fix this without hack overriding tauri to use newer webview2 bindings, really not worth my time.
                    #[cfg(target_os = "windows")]
                    CustomMenuItem::new("find", "Find")
                        .accelerator("cmdOrControl+H")
                        .into(),
                    // Windows doesn't take ctrl-f because of webview2 catching it, i can't fix this without hack overriding tauri to use newer webview2 bindings, really not worth my time.
                    #[cfg(not(target_os = "windows"))]
                    CustomMenuItem::new("find", "Find")
                        .accelerator("cmdOrControl+F")
                        .into(),
                ]),
            )),
            MenuEntry::Submenu(Submenu::new(
                "View",
                Menu::with_items([
                    MenuItem::EnterFullScreen.into(),
                    MenuItem::Separator.into(),
                    CustomMenuItem::new("zoomin", "Zoom In")
                        .accelerator("cmdOrControl+=")
                        .into(),
                    CustomMenuItem::new("zoomout", "Zoom Out")
                        .accelerator("cmdOrControl+-")
                        .into(),
                    CustomMenuItem::new("resetzoom", "Reset Zoom")
                        .accelerator("cmdOrControl+0")
                        .into(),
                ]),
            )),
            MenuEntry::Submenu(Submenu::new(
                "Window",
                Menu::with_items([MenuItem::Minimize.into(), MenuItem::Zoom.into()]),
            )),
            // You should always have a Help menu on macOS because it will automatically
            // show a menu search field
            MenuEntry::Submenu(Submenu::new(
                "Help",
                Menu::with_items([CustomMenuItem::new("Learn More", "Learn More").into()]),
            )),
        ]))
        .on_menu_event(|event| {
            let event_name = event.menu_item_id();
            if event_name == "Learn More" {
                let url =
                    "https://github.com/horizon-games/OpenSky/tree/master/sheet".to_string();
                shell::open(&event.window().shell_scope(), url, None).unwrap();
            }
        })
        .manage(DataLoadStatus {
            is_loading: Arc::new(Mutex::new(false)),
        })
        .invoke_handler(tauri::generate_handler![
            get_database,
            update_paths,
            open_db_folder
        ])
        .setup(|app| {
            let handle = app.app_handle();
            let store_prefix_path = store_dir();
            println!("[watch] Watching for changes at {:?}", store_prefix_path);
            fs::create_dir_all(store_prefix_path.clone())
                .expect("[error] Failed to create storage directory.");
            let state: Arc<Mutex<bool>> = Arc::clone(&app.state::<DataLoadStatus>().is_loading);
            tauri::async_runtime::spawn(async move {
                let (tx, rx) = std::sync::mpsc::channel();
                let mut watcher = RecommendedWatcher::new(tx, notify::Config::default()).unwrap();
                watcher
                    .watch(store_prefix_path.as_ref(), RecursiveMode::Recursive)
                    .unwrap();
                for res in rx {
                    if *state.lock().unwrap() {
                        continue;
                    }
                    match res {
                        Ok(event) => {
                            match event.kind {
                                notify::EventKind::Modify(ModifyKind::Name(RenameMode::Both)) => {
                                    // file was renamed
                                    let paths: Vec<_> = event
                                        .paths
                                        .into_iter()
                                        .map(|p| FSEntry::read_from_path(&store_prefix_path, &p))
                                        .collect();
                                    if !paths[1].path().iter().any(|p| p == ".git") {
                                        let normalized_paths = paths
                                            .into_iter()
                                            .map(|p| {
                                                p.path()
                                                    .to_string_lossy()
                                                    .to_string()
                                                    .replace(std::path::MAIN_SEPARATOR, "/")
                                            })
                                            .collect::<Vec<_>>();
                                        handle.emit_all("rename_path", normalized_paths).unwrap();
                                    }
                                }
                                notify::EventKind::Modify(_) | notify::EventKind::Remove(_) => {
                                    fn make_flat_vec_of_recursive_dir_contents(
                                        store_prefix_path: &PathBuf,
                                        dir_path: &PathBuf,
                                    ) -> Vec<FSEntry> {
                                        // if we're in .git, bail
                                        if dir_path.iter().any(|c| c == ".git") {
                                            return vec![];
                                        }

                                        // if it's a single file, easy early exit.
                                        if dir_path.is_file() {
                                            return vec![FSEntry::read_from_path(
                                                &store_prefix_path,
                                                &dir_path,
                                            )];
                                        }

                                        // if dir doesn't exist, **or is empty**, short-circuit
                                        if !dir_path.exists()
                                            || dir_path
                                                .read_dir()
                                                .expect("dir readable")
                                                .next()
                                                .is_none()
                                        {
                                            return vec![FSEntry::create_delete_path(
                                                &store_prefix_path,
                                                dir_path,
                                            )];
                                        }

                                        let mut entries = vec![];

                                        for entry in WalkDir::new(dir_path.clone()) {
                                            let entry = entry.unwrap();
                                            if entry.file_type().is_file() {
                                                entries.push(FSEntry::read_from_path(
                                                    &store_prefix_path,
                                                    entry.path(),
                                                ));
                                            } else if entry.file_type().is_dir() {
                                                let mut new_path = dir_path.clone();
                                                new_path.push(entry.file_name());
                                                entries.append(
                                                    &mut make_flat_vec_of_recursive_dir_contents(
                                                        &store_prefix_path,
                                                        &new_path,
                                                    ),
                                                );
                                            }
                                        }
                                        return entries;
                                    }

                                    let fs_entries: Vec<_> =
                                        make_flat_vec_of_recursive_dir_contents(
                                            &store_prefix_path,
                                            &event.paths[0],
                                        )
                                        .into_iter()
                                        .map(NormalizedFSEntry::from)
                                        .collect();
                                    println!(
                                        "[watch] updated {}.",
                                        fs_entries
                                            .iter()
                                            .map(|f| f.path.clone())
                                            .collect::<Vec<_>>()
                                            .join(", ")
                                    );

                                    handle.emit_all("paths_updated", fs_entries).unwrap();
                                }

                                notify::EventKind::Access(_)
                                | notify::EventKind::Create(_)
                                | notify::EventKind::Other
                                | notify::EventKind::Any => {}
                            }
                        }
                        Err(error) => eprintln!("Error: {error:?}"),
                    }
                }
            });
            Ok(())
        })
        .run(ctx)
        .expect("error while running tauri application");
}

#[derive(Clone, Serialize, Deserialize)]
struct PathUpdate {
    path: String,
    value: Option<Value>,
}

#[tauri::command]
fn update_paths(paths: Value, state: State<DataLoadStatus>) {
    *state.is_loading.lock().unwrap() = true;
    let paths: Vec<PathUpdate> = serde_json::from_value(paths).unwrap();
    for PathUpdate { path, value } in paths {
        let unprefixed_path = path.strip_prefix('/').unwrap();
        println!("[js write] update path {} to {:?}", unprefixed_path, &value);
        _write_path_update_to_disk(unprefixed_path, value);
    }
    *state.is_loading.lock().unwrap() = false;
}

fn _write_path_update_to_disk(path: &str, value: Option<Value>) {
    let store_dir = store_dir();
    let fs_path = store_dir.join(path.replace('/', std::path::MAIN_SEPARATOR_STR));

    match value {
        Some(Value::Object(o)) => {
            // first, figure out if this object is empty. if it is, delete it from FS.
            if o.is_empty() {
                if fs_path.exists() {
                    if fs_path.is_file() {
                        fs::remove_file(fs_path).unwrap();
                    } else {
                        fs::remove_dir_all(fs_path).unwrap();
                    }
                }
                return;
            }
            // otherwise, recurse into the object's key/values, and call update_path for each of these.
            for (k, v) in o {
                let mut p = path.to_string();
                if !p.is_empty() {
                    p.push('/');
                }
                p.push_str(&k);
                _write_path_update_to_disk(&p, Some(v));
            }
        }
        None => {
            // delete the file or directory if it exists
            if fs_path.exists() {
                if fs_path.is_file() {
                    println!("[js write] Deleting file {:?}", fs_path);
                    fs::remove_file(fs_path).unwrap();
                } else {
                    println!("[js write] Deleting dir {:?}", fs_path);
                    fs::remove_dir_all(fs_path).unwrap();
                }
            }
        }
        Some(value) => {
            let parent_path = fs_path
                .parent()
                .expect("[error] Every file in our FS should have a parent.");
            fs::create_dir_all(parent_path).expect("[error] Creating parent dir failed!");
            File::create(fs_path)
                .unwrap()
                .write_all(value.to_string().as_bytes())
                .unwrap();
        }
    }
}

#[tauri::command]
fn get_database() -> Value {
    let store_dir = store_dir();
    println!(
        "[get_database] Loading database from {} ...",
        store_dir.display()
    );
    let entries = get_fs_entries_of_folder_recursive(store_dir.to_str().unwrap().to_string());
    println!(
        "[get_database] Got {} FSEntries, converting to JSON...",
        entries.len()
    );
    let json = filesystem_to_json(entries);
    println!("[get_database] Database sent to UI.");
    json
}

#[tauri::command]
fn open_db_folder(app: tauri::AppHandle) {
    let store_dir = store_dir();
    println!(
        "[open_db_folder] Opening database folder at {} ...",
        store_dir.display()
    );
    shell::open(&app.shell_scope(), store_dir.to_str().unwrap(), None).unwrap();
}
