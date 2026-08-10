use super::effect_helpers::*;
serializable_filter!(SerializableFilter::C2157, |c| is_wisp(c.base())
  || is_scion(c.base()));

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
          SerializableFilter::C2157,
        );
        game.draw(owner, |c, _| is_wisp(&c.base)).await;
        game.draw(owner, |c, _| is_scion(&c.base)).await;
      })
    },
  }
});
