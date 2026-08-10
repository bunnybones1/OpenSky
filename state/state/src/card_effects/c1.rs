use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Untargeted {
    mutate: |game, my_id, owner| {
      Box::pin(async move {
        let damage = 2;
        let targets_to_damage: Vec<_> = game
          .all_units::<&CardInstance<SkyWeaver>>()
          .into_iter()
          .filter(|u| !u.traits.contains(&Trait::Wither))
          .map(|token| token.id())
          .collect();

        game.damage_many(&targets_to_damage, damage, my_id).await;

        game
          .draw(owner, |card, _| card.traits.contains(&Trait::Wither))
          .await;
      })
    },
  }
});
