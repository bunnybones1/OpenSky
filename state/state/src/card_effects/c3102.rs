use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, _, owner| Box::pin(async move {
    let hero = game.hero_id(owner);

    let attachments_to_dust: Vec<_> = game
      .all_characters::<&CardInstance<SkyWeaver>>()
      .into_iter()
      .filter_map(|c| c.attachment())
      .map_into()
      .collect();
    let heal = game
      .dust_many(attachments_to_dust)
      .await
      .into_iter()
      .filter(|p| {
        matches!(
          p,
          ResolvedPhase::MoveToZone(ResolvedPhaseMoveToZone {
            to: (_, Zone::Dust { .. }),
            ..
          })
        )
      })
      .count();
    game.change_health(hero, heal as i8).await;
  }))
  .into()],
  on_play: None
});
