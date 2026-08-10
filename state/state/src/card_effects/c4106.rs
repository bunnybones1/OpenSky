use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![
    unit_summon!(|game, my_id| Box::pin(async move {
      lapin_effect(game, game.owner(my_id)).await;
    }))
    .into(),
    unit_death!(|game, my_id, _| Box::pin(async move {
      lapin_effect(game, game.owner(my_id)).await;
    }))
    .into()
  ],
  on_play: None
});

async fn lapin_effect(game: &mut LiveGame<'_>, player: Player) {
  game.add_to_hand(player, BaseCard::C20058).await;
}
