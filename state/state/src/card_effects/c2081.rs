use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let enemy_hero = game.hero_id(enemy(game.owner(my_id)));
    let is_enemy_turn = game.current_player != game.owner(my_id);
    game
      .grant_modifier_for_turns(
        enemy_hero,
        my_id,
        Modifier::GrantEffect(CardEffect::FrostAdept),
        0,
        if is_enemy_turn { 1 } else { 2 },
      )
      .await;
  }))
  .into()],
  on_play: None
});

attachable_effect!(
  struct FrostAdept;,
  FROSTADEPT,
  Effect::Unit {
    triggers: vec![unit_aura!(
      |game, my_id| Box::pin(async move {
        let owner = game.owner(my_id);
        for id in game.field_cards(owner).clone() {
          game
            .add_aura_modifier(id, my_id, Modifier::ModifyPower(-2, None), 0)
            .await;
        }
      }),
      AuraLayer::DecreaseStat
    )
    .into()],
    on_play: None
  }
);
