use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![],
  on_play: Some((
    SummonTiming::BeforeText,
    OnPlayEffect::MaybeTargeted {
      does_target: targets::enemy_unit,
      mutate: |game, my_id, target, _| {
        Box::pin(async move {
          if let Some(target) = target {
            let my_attachment = my_id.instance(game, None).unwrap().attachment();
            let enemy_attachment = target.instance(game, None).unwrap().attachment();
            if let Some(my_attachment) = my_attachment {
              game
                .give_spell(target, *my_attachment.instance(game, None).unwrap().base())
                .await;
              if let Some(enemy_attachment) = enemy_attachment {
                game
                  .give_spell(
                    my_id,
                    *enemy_attachment.instance(game, None).unwrap().base(),
                  )
                  .await;
              } else {
                game.dust(my_attachment).await;
              }
            } else if let Some(enemy_attachment) = enemy_attachment {
              game
                .give_spell(
                  my_id,
                  *enemy_attachment.instance(game, None).unwrap().base(),
                )
                .await;
              game.dust(enemy_attachment).await;
            }
          }
        })
      },
    }
  ))
});
