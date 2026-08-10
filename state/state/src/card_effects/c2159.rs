use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::ally,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let max_mana: u32 = game.player(owner).max_mana.into();
        let heal_amt = 3. + ((max_mana as f32 / 5.).floor());

        game
          .modify_card_single(target, Modifier::ModifyHealth(heal_amt as i8, None))
          .await;
      })
    },
  }
});
