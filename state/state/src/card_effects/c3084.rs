use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((SummonTiming::AfterText, {
    OnPlayEffect::MaybeTargeted {
      does_target: targets::any_unit,
      mutate: |game, my_id, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            let target_element = target.instance(game, None).unwrap().element;
            let result = game
              .modify_card_single(my_id, Modifier::SetElement(target_element))
              .await;
            if let Ok(ResolvedPhaseModifyCard {
              card,
              modifier: Modifier::SetElement(e),
              ..
            }) = result.try_into()
            {
              if target_element == e && Some(my_id) == card.id() {
                game.give_spell(my_id, enchant::FATE).await;
              }
            }
          }
        })
      },
    }
  }))
});
