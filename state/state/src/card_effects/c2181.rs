use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_unit,
    mutate: |game, _my_id, target, owner| {
      Box::pin(async move {
        let target_hp = game.reveal_from_card(target, |c| c.health).await;

        game
          .modify_card_single(target, Modifier::SetPower(target_hp.into()))
          .await;

        if game.owner(target) == enemy(owner) {
          game
            .modify_card_single(target, Modifier::ModifyPower(-2, None))
            .await;
          game.give_spell(target, BaseCard::C20027).await;
        }
      })
    },
  }
});
