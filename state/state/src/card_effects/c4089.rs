use rand::seq::SliceRandom;
use rand::SeedableRng;

use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);

    let public_entropy = game.get_entropy().await;
    let spells_to_discard: Vec<Card> = game
      .context()
      .reveal_unique(
        owner,
        move |secret| {
          let mut rng = rand_xorshift::XorShiftRng::from_seed(public_entropy);
          let deck_spells = secret
            .deck()
            .iter()
            .filter(|c| secret.instance(*c).unwrap().is_spell())
            .copied()
            .collect_vec();

          deck_spells
            .choose_multiple(&mut rng, 10)
            .copied()
            .map(|c| c.into())
            .collect_vec()
        },
        |_| true,
      )
      .await;

    let count = spells_to_discard.len();
    game.dust_many(spells_to_discard).await;

    let hero = game.hero_id(owner);
    game
      .change_health(hero, SaturatingU8::from(count).into())
      .await;
  }))
  .into()],
  on_play: None
});
