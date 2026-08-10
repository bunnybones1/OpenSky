use super::effect_helpers::*;
intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::enemy_unit,
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        game.damage(target, 2, my_id).await;
        let picked = {
          // tutorial rigged - prioritize these units:
          let bonder = game
            .units::<&CardInstance<SkyWeaver>>(owner)
            .iter()
            .find_map(|c| (*c.base() == BaseCard::C30113).then_some(c.id()));
          let cannon = game
            .units::<&CardInstance<SkyWeaver>>(owner)
            .iter()
            .find_map(|c| (*c.base() == BaseCard::C30115).then_some(c.id()));

          if bonder.is_some() {
            bonder
          } else if cannon.is_some() {
            cannon
          } else {
            let units = game.units::<InstanceID>(owner);
            let mut rng = game.context().random().await;
            units.iter().choose(&mut rng).copied()
          }
        };
        if let Some(picked) = picked {
          game
            .modify_card_single(picked, Modifier::ModifyPower(1, None))
            .await;
        }
      })
    },
  }
});
