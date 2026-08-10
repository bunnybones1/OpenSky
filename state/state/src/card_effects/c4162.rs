use super::effect_helpers::*;
serializable_filter!(SerializableFilter::C4162, |c| c.element == Element::Water
  || c.element == Element::Mind);

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        game.add_global_modifier(
          owner,
          my_id,
          vec![
            Modifier::ModifyHealth(1, None),
            Modifier::ModifyPower(1, None),
          ],
          SerializableFilter::C4162,
        );

        game
          .draw(owner, |c, _| {
            c.is_unit() && (c.element == Element::Water || c.element == Element::Mind)
          })
          .await;
      })
    },
  }
});
