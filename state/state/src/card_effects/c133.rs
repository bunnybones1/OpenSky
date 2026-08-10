use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![
    unit_summon!(|game, my_id| Box::pin(async move {
      pontiff_effect(game, game.owner(my_id)).await;
    }))
    .into(),
    sunrise!(|game, my_id, _| Box::pin(async move {
      pontiff_effect(game, game.owner(my_id)).await;
    }))
    .into()
  ],
  on_play: None
});

async fn pontiff_effect(game: &mut LiveGame<'_>, player: Player) {
  game.instantiate_and_summon(player, BaseCard::C20001).await;
}
