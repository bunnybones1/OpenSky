use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |g, _, _, _, c| {
      c.instance(g, None)
        .unwrap()
        .attachment()
        .map(|id| id.instance(g, None).unwrap().is_enchant())
        .unwrap_or(false)
    },
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let target_view = target.instance(game, None).unwrap();
        let enchant_id = target_view.attachment().unwrap();
        let enchant_view = enchant_id.instance(game, None).unwrap();
        let element = enchant_view.element;
        if game.dust(enchant_id).await {
          game.draw(owner, move |c, _| c.element == element).await;
        }
      })
    },
  }
});
