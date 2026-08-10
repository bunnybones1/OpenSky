use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![
    inspire!(move |played_cost, _| played_cost == 1, |game, my_id, _| {
      Box::pin(async move {
        game.berf(my_id, 1, 1).await;
      })
    })
    .into()
  ],
  on_play: None
});
