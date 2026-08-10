use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![inspire!(|_, _| true, |game, my_id, _phase| {
    Box::pin(async move {
      game.change_power(my_id, 1).await;

      let (old_pow, old_hp) = game.reveal_from_card(my_id, |c| (c.power, c.health)).await;
      // Randomize stats (with min of 1 value)
      let total_stats = u8::from(old_pow) + u8::from(old_hp);
      let mut rng = game.context().random().await;
      let pow: u8 = rng.gen_range(1..total_stats);
      let hp: u8 = total_stats - pow;

      game
        .modify_card(
          my_id,
          vec![
            Modifier::SetPower(pow.into()),
            Modifier::SetHealth(hp.into()),
          ],
        )
        .await;
    })
  })
  .into()],
  on_play: None
});
