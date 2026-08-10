use std::{
    fs,
    path::{Component, Path, PathBuf},
};
use walkdir::{DirEntry, WalkDir};

fn is_hidden(entry: &DirEntry) -> bool {
    entry
        .file_name()
        .to_str()
        .map(|s| s.starts_with('.'))
        .unwrap_or(false)
}

pub fn get_fs_entries_of_folder_recursive(dir: String) -> Vec<FSEntry> {
    if !Path::new(&dir).is_dir() {
        return vec![];
    }
    let mut entries: Vec<FSEntry> = vec![];
    for entry in WalkDir::new(dir.clone())
        .into_iter()
        .filter_entry(|e| !is_hidden(e))
    {
        let entry = entry.unwrap();
        if entry.file_type().is_file() {
            entries.push(FSEntry::read_from_path(Path::new(&dir), entry.path()));
        }
    }
    entries
}

#[derive(Debug, PartialEq, Eq, Clone)]
pub struct FSEntry {
    path: PathBuf,
    contents: Option<String>,
}

impl FSEntry {
    pub fn path(&self) -> &PathBuf {
        &self.path
    }
    pub fn contents(&self) -> &Option<String> {
        &self.contents
    }
    pub fn read_from_path(prefix: &Path, path: &Path) -> FSEntry {
        let normalized_prefix = normalize_path(prefix);
        let normalized_path = normalize_path(path);

        let contents = fs::read_to_string(normalized_path.clone()).ok();

        if let Ok(stripped) = normalized_path
            .clone()
            .strip_prefix(normalized_prefix.clone())
        {
            FSEntry {
                path: stripped.into(),
                contents,
            }
        } else {
            panic!(
                "Failed to strip path from prefix. Normalized Prefix is {:?}, Normalized Path is {:?}",
                normalized_prefix, normalized_path
            );
        }
    }
    pub fn create_delete_path(prefix: &Path, path: &Path) -> FSEntry {
        let normalized_prefix = normalize_path(prefix);
        let normalized_path = normalize_path(path);

        if let Ok(stripped) = normalized_path
            .clone()
            .strip_prefix(normalized_prefix.clone())
        {
            FSEntry {
                path: stripped.into(),
                contents: None,
            }
        } else {
            panic!(
                "Failed to strip path from prefix. Normalized Prefix is {:?}, Normalized Path is {:?}",
                normalized_prefix, normalized_path
            );
        }
    }
}

pub fn json_to_filesystem(json: &serde_json::Value) -> Vec<FSEntry> {
    _json_to_filesystem(json, PathBuf::new())
}
fn _json_to_filesystem(json: &serde_json::Value, path_prefix: PathBuf) -> Vec<FSEntry> {
    let mut filesystem: Vec<FSEntry> = vec![];
    let json_obj = json.as_object().unwrap();
    for (key, value) in json_obj {
        let new_path = {
            let mut p = path_prefix.clone();
            p.push(key);
            p
        };
        if value.is_object() {
            filesystem.extend(_json_to_filesystem(value, new_path));
        } else {
            filesystem.push(FSEntry {
                path: new_path,
                contents: Some(value.to_string()),
            });
        }
    }
    filesystem
}

pub fn filesystem_to_json(fs: Vec<FSEntry>) -> serde_json::Value {
    let mut json = serde_json::json!({});
    for entry in fs {
        let Some(value_str) = entry.contents else {
            continue;
        };

        let path = &entry.path;
        let mut cur = &mut json;
        for raw_part in path {
            if raw_part.is_empty() {
                continue;
            }
            let part = raw_part.to_str().expect("non-utf8 path. not supported.");
            if cur.is_object() {
                let cur_obj = cur.as_object_mut().unwrap();
                if cur_obj.contains_key(part) {
                    cur = cur_obj.get_mut(part).unwrap();
                } else {
                    cur_obj.insert(part.to_string(), serde_json::json!({}));
                    cur = cur_obj.get_mut(part).unwrap();
                }
            } else {
                panic!("not an object");
            }
        }
        *cur = serde_json::from_str(&value_str)
            .expect("Invalid JSON contents for file. If it's a string, wrap it in quotes.");
    }
    json
}

#[test]
fn test_fs_json() {
    let json = &serde_json::from_str("{\"a\": {\"b\": \"c\", \"d\": 3, \"f\": [1,2,3]}}").unwrap();
    let filesystem = json_to_filesystem(json);
    assert_eq!(
        filesystem,
        json_to_filesystem(&filesystem_to_json(filesystem.clone())),
        "filesystem survives round trip"
    );
    assert_eq!(
        json,
        &filesystem_to_json(json_to_filesystem(json)),
        "json survives round trip"
    );
}

const DATA_FOLDER: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/../../design-data/raw",);
pub fn store_dir() -> PathBuf {
    normalize_path(&PathBuf::from(DATA_FOLDER))
}

fn normalize_path(path: &Path) -> PathBuf {
    let mut components = path.components().peekable();
    let mut ret = if let Some(c @ Component::Prefix(..)) = components.peek().cloned() {
        components.next();
        PathBuf::from(c.as_os_str())
    } else {
        PathBuf::new()
    };

    for component in components {
        match component {
            Component::Prefix(..) => unreachable!(),
            Component::RootDir => {
                ret.push(component.as_os_str());
            }
            Component::CurDir => {}
            Component::ParentDir => {
                ret.pop();
            }
            Component::Normal(c) => {
                ret.push(c);
            }
        }
    }
    ret
}
