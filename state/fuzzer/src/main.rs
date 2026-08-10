use skyweaver_rs::{
    card_movement_simulator::{
        arcadeum::{
            store::StoreState,
            utils::{hex, unhex},
        },
        GameState, PlayerSecret,
    },
    client::get_valid_actions,
    GameStatus, PlayerAction, PlayerSeed, Prism, SkyWeaver,
};

static PRISMS: [[Option<Prism>; 2]; 15] = [
    [Some(Prism::Agility), None],
    [Some(Prism::Heart), None],
    [Some(Prism::Intellect), None],
    [Some(Prism::Strength), None],
    [Some(Prism::Wisdom), None],
    [Some(Prism::Agility), Some(Prism::Heart)],
    [Some(Prism::Agility), Some(Prism::Intellect)],
    [Some(Prism::Agility), Some(Prism::Strength)],
    [Some(Prism::Agility), Some(Prism::Wisdom)],
    [Some(Prism::Heart), Some(Prism::Intellect)],
    [Some(Prism::Heart), Some(Prism::Strength)],
    [Some(Prism::Heart), Some(Prism::Wisdom)],
    [Some(Prism::Intellect), Some(Prism::Strength)],
    [Some(Prism::Intellect), Some(Prism::Wisdom)],
    [Some(Prism::Strength), Some(Prism::Wisdom)],
];

#[cfg(not(debug_assertions))]
fn main() {
    panic!("fuzzer is not available in release mode.");
}

#[cfg(debug_assertions)]
fn main() {
    let yaml = clap::load_yaml!("options.yaml");
    let options = clap::App::from_yaml(yaml).get_matches();

    match options.value_of("seed") {
        None => {
            for i in 0.. {
                let seed = rand::random();
                let mut random: rand_pcg::Pcg64Mcg = rand::SeedableRng::from_seed(seed);

                println!("=== test #{}, seed {} ===", i, hex(&seed));

                test(&mut random, false);

                println!("=== test #{} finished, seed {} ===", i, hex(&seed));
            }
        }
        Some(seed) => {
            let seed = std::convert::TryInto::try_into(unhex(seed).unwrap()).unwrap();
            let mut random: rand_pcg::Pcg64Mcg = rand::SeedableRng::from_seed(seed);

            println!("=== test #0, seed {} ===", hex(&seed));

            test(&mut random, true);

            println!("=== test #0 finished, seed {} ===", hex(&seed));
        }
    }
}

#[cfg(debug_assertions)]
fn test(random: &mut impl rand::RngCore, verbose: bool) {
    let state = GameState::new(
        SkyWeaver::new(
            Default::default(),
            random_player_seed(random),
            random_player_seed(random),
        ),
        true,
    );

    let secrets = [
        Some((
            PlayerSecret::new(0, Default::default()),
            rand::SeedableRng::from_seed({
                let mut seed: <rand_xorshift::XorShiftRng as rand::SeedableRng>::Seed =
                    Default::default();

                random.try_fill_bytes(&mut seed).unwrap();
                seed
            }),
        )),
        Some((
            PlayerSecret::new(1, Default::default()),
            rand::SeedableRng::from_seed({
                let mut seed: <rand_xorshift::XorShiftRng as rand::SeedableRng>::Seed =
                    Default::default();

                random.try_fill_bytes(&mut seed).unwrap();
                seed
            }),
        )),
    ];

    let mut state = StoreState::new(state, secrets, |_, _| ());

    state
        .apply_with_random(None, PlayerAction::Setup, random)
        .unwrap();

    while let GameStatus::Playing = state.state().unwrap().status {
        let player = state.state().unwrap().current_player;

        let actions = get_valid_actions(
            state.state().unwrap(),
            player,
            &state.secret(player).unwrap(),
        );

        let action = rand::seq::SliceRandom::choose(actions.as_slice(), random).unwrap();

        if verbose {
            println!(
                "------------------------------------ STATE -------------------------------------"
            );
            println!();
            println!("{:#?}", state.state());
            println!();
            println!(
                "----------------------------------- SECRET 0 -----------------------------------"
            );
            println!();
            println!("{:#?}", **state.secret(0).unwrap());
            println!();
            println!(
                "----------------------------------- SECRET 1 -----------------------------------"
            );
            println!();
            println!("{:#?}", **state.secret(1).unwrap());
            println!();
            println!(
                "------------------------------------ ACTION ------------------------------------"
            );
            println!();
            println!("player {}: {:?}", player, action);
            println!();
        } else {
            println!("player {}: {:?}", player, action);
        }

        state
            .apply_with_random(Some(player), action.clone(), random)
            .unwrap();

        if let Err(error) = state.state().unwrap().ok(&[
            Some(&*state.secret(0).unwrap()),
            Some(&*state.secret(1).unwrap()),
        ]) {
            println!("invariant broken: {:?}", error);

            if verbose {
                println!();
            }

            break;
        }
    }

    if verbose {
        println!(
            "------------------------------------ STATE -------------------------------------"
        );
        println!();
        println!("{:#?}", state.state());
        println!();
        println!(
            "----------------------------------- SECRET 0 -----------------------------------"
        );
        println!();
        println!("{:#?}", **state.secret(0).unwrap());
        println!();
        println!(
            "----------------------------------- SECRET 1 -----------------------------------"
        );
        println!();
        println!("{:#?}", **state.secret(1).unwrap());
        println!();
    }
}

fn random_player_seed(random: &mut impl rand::RngCore) -> PlayerSeed {
    PlayerSeed {
        prisms: rand::seq::SliceRandom::choose(&PRISMS[..], random)
            .unwrap()
            .iter()
            .flatten()
            .copied()
            .collect(),
        hero_ability: None,
    }
}
