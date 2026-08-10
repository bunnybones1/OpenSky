use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, my_id, _| Box::pin(async move {
    let owner = game.owner(my_id);
    if game.player(owner).mana == 0 {
      game.give_spell(my_id, BaseCard::C20017).await;
    }
  }))
  .into()],
  on_play: None
});
