use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![
    unit_summon!(|game, my_id| Box::pin(async move {
      let owner = game.owner(my_id);
      abyss_lion_effect(game, owner).await;
    }))
    .into(),
    unit_slay!(|game, my_id, _target| Box::pin(async move {
      let owner = game.owner(my_id);
      abyss_lion_effect(game, owner).await;
    }))
    .into()
  ],
  on_play: None
});

async fn abyss_lion_effect(game: &mut LiveGame<'_>, owner: u8) {
  for _ in 0..2u8 {
    game
      .instantiate_and_run_and_summon(owner, BaseCard::C20013, |game, c| {
        Box::pin(async move {
          game
            .modify_card_single(c, Modifier::GrantTrait(Trait::Banner))
            .await;
        })
      })
      .await;
  }
}
