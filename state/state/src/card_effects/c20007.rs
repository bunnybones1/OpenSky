use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_target,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let ally_elements: Vec<_> = game
          .units::<&CardInstance<SkyWeaver>>(owner)
          .into_iter()
          .map(|c| c.element)
          .collect();
        let n_elem = ally_elements.iter().unique().count() as u8;
        game.damage(target, n_elem, my_id).await;
      })
    },
  }
});
