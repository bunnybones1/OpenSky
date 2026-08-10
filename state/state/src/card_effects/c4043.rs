use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: |g, s, p, i, t| targets::any_unit(g, s, p, i, t)
      && conditions::has_another_card_in_hand(g, s, i, p),
    mutate: |game, my_id, target, owner| {
      Box::pin(async move {
        let hand_size = game.player_cards(owner).hand().len() as u8;
        game.damage(target, hand_size, my_id).await;
        game.mulligan_hand(owner).await;
      })
    },
  }
});
