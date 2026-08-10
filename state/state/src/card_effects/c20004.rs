use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |g, _, _, my_id, c| match c.instance(g, None).unwrap().attachment() {
      Some(id) => id != my_id,
      None => false,
    },

    mutate: |game, my_id, target, _| {
      Box::pin(async move {
        let attachment_id = target.instance(game, None).unwrap().attachment().unwrap();
        let damage = attachment_id.instance(game, None).unwrap().cost;
        game.dust(attachment_id).await;
        game.damage(target, damage.into(), my_id).await;
      })
    },
  }
});
