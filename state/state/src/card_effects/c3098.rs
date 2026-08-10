use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    let card = game.instantiate_and_summon(owner, BaseCard::C3000).await;
    if let Some(card) = card {
      game
        .modify_card(card, vec![Modifier::GrantTrait(Trait::Stealth)])
        .await;
    }
  }))
  .into()],
  on_play: None
});
