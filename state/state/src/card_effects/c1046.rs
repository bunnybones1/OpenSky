use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: xcost_set!(
    |game, my_id| Box::pin(async move {
      game
        .characters::<InstanceID>(game.owner(my_id))
        .len()
        .into()
    }),
    |game, secret, _| { game.characters::<InstanceID>(secret.player()).len().into() }
  ),
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let my_mana = game.player(owner).mana;
        let cost = my_id.instance(game, None).unwrap().cost;
        if my_mana >= cost {
          game.change_mana(owner, -i32::from(cost)).await;
          let allies = game.characters(owner);
          game.give_spell_many(&allies, BaseCard::C20022).await;
        }
      })
    },
  }
});
