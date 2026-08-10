use skyweaver_rs::{
    card_movement_simulator::{
        arcadeum::{
            store::{Store, StoreState},
            utils::{hex, unhex},
            Diff, RootProof, State,
        },
        GameState, PlayerSecret,
    },
    SkyWeaver,
};

#[cfg(not(debug_assertions))]
fn main() {
    panic!("replayer is not available in release mode.");
}

#[cfg(debug_assertions)]
fn main() {
    let yaml = clap::load_yaml!("options.yaml");
    let options = clap::App::from_yaml(yaml).get_matches();

    let (match_id, replay_id): (u64, &str) =
        match (options.value_of("id"), options.value_of("replay-id")) {
            (Some(id), Some(replay_id)) => (id.parse().unwrap(), replay_id),
            _ => {
                clap::App::from_yaml(yaml).print_help().unwrap();

                std::process::exit(1);
            }
        };

    println!("match #{}", match_id);
    println!();
    let api_base_url = options.value_of("api-url").unwrap();

    async_std::task::block_on(async {
        let Index { record_uris: pages } =
            surf::post(api_base_url.to_string() + "/rpc/SkyWeaverAPI/GetMatchArchiveRecordsURI")
                .body_json(&Request {
                    match_id,
                    replay_id,
                })
                .unwrap()
                .recv_json()
                .await
                .unwrap();

        let [root]: [Root; 1] = surf::get(&pages[0]).recv_json().await.unwrap();

        println!("commit {}", root.commit);

        println!();

        let game_version = <StoreState<GameState<SkyWeaver>> as State>::version();
        let match_version =
            RootProof::<StoreState<GameState<SkyWeaver>>>::version(&unhex(&root.root).unwrap())
                .unwrap();

        println!("game version {}", hex(game_version));
        println!("match version {}", hex(&match_version));

        println!();

        if match_version != game_version {
            println!("error: version mismatch");

            println!();

            println!(
                "either `git checkout {}` or replace ../state/src/version.rs with:",
                root.commit
            );

            println!();

            println!("```");
            println!("// {}", hex(&match_version));
            println!(
                "pub const ARCADEUM_GENERATED_VERSION: [u8; 32] = {:?};",
                match_version
            );
            println!("```");

            println!();

            std::process::exit(1);
        }

        let total = std::rc::Rc::new(std::cell::RefCell::new(std::time::Duration::new(0, 0)));

        let before = std::time::Instant::now();

        let mut store = Store::<GameState<SkyWeaver>>::new(
            None,
            &unhex(&root.root).unwrap(),
            {
                let [secret0, secret1] = root.secrets;
                [Some(secret0), Some(secret1)]
            },
            true,
            {
                let total = total.clone();

                move |state, secrets| {
                    println!();
                    println!("state: {:#?}", state);
                    println!();
                    println!("secrets: {:#?}", secrets);
                    println!();

                    if let Err(error) = state.ok(&secrets) {
                        println!();
                        println!("error: {:?}", error);
                        println!();
                        println!("total time: {:?}", total.try_borrow().unwrap());
                        println!();

                        std::process::exit(1);
                    }
                }
            },
            |_| unreachable!(),
            |_| unreachable!(),
            {
                let mut depth = 0;

                move |_, event| {
                    let event = format!("{:?}", event);

                    if event.starts_with("Exit") {
                        depth -= 1;
                    }

                    println!("log: {}{}", "  ".repeat(depth), event);

                    if event.starts_with("Enter") {
                        depth += 1;
                    }
                }
            },
            UnreachableRng,
            true,
        )
        .unwrap();

        let duration = before.elapsed();

        *total.try_borrow_mut().unwrap() += duration;

        println!();
        println!("time: {:?}", duration);
        println!();

        let mut nonce = 0;

        for page in &pages[1..] {
            let messages: Vec<serde_json::Value> = surf::get(page).recv_json().await.unwrap();

            for message in messages {
                if message["type"] == serde_json::Value::String("gameplay".to_string()) {
                    let message = &message["message"];

                    if message["type"] == serde_json::Value::String("gameplay".to_string()) {
                        let before = std::time::Instant::now();

                        let diff: Diff<StoreState<GameState<SkyWeaver>>> = Diff::deserialize(
                            &unhex(message["data"][0].as_str().unwrap()).unwrap(),
                        )
                        .unwrap();

                        println!();
                        println!("diff {}: {:?}", nonce, diff);
                        nonce += 1;

                        if let Err(error) = store.raw_apply(&diff) {
                            println!();
                            println!("error: {}", error);
                            println!();
                            panic!("failed to apply diff {:?}", &diff);
                        }

                        let duration = before.elapsed();

                        *total.try_borrow_mut().unwrap() += duration;

                        println!();
                        println!("time: {:?}", duration);
                    }
                }
            }
        }

        if let Err(error) = store.flush_actions(false) {
            println!();
            println!("error: {}", error);
            println!();
        }

        println!();
        println!("total time: {:?}", total.try_borrow().unwrap());
        println!();
    });
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Request<'a> {
    #[serde(rename = "matchID")]
    match_id: u64,

    #[serde(rename = "replayID")]
    replay_id: &'a str,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Index {
    #[serde(rename = "recordURIs")]
    record_uris: Vec<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct Root {
    #[serde(rename = "version")]
    commit: String,
    #[serde(rename = "rootProof")]
    root: String,
    #[serde(rename = "secrets")]
    secrets: [(PlayerSecret<SkyWeaver>, [u8; 16]); 2],
}

struct UnreachableRng;

impl rand::RngCore for UnreachableRng {
    fn next_u32(&mut self) -> u32 {
        unreachable!();
    }

    fn next_u64(&mut self) -> u64 {
        unreachable!();
    }

    fn fill_bytes(&mut self, _dest: &mut [u8]) {
        unreachable!();
    }

    fn try_fill_bytes(&mut self, _dest: &mut [u8]) -> Result<(), rand::Error> {
        unreachable!();
    }
}
