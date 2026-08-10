use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![sunset!(|game, _my_id, owner| Box::pin(async move {
    let curr_hero_hp = game.hero(owner).health;
    let start_hero_hp = game.player(owner).this_turn_stats.hero_hp_at_turn_start;
    if curr_hero_hp > start_hero_hp {
      game.draw_any_card(owner).await;
    } else if curr_hero_hp < start_hero_hp {
      game.instantiate_and_summon(owner, BaseCard::C20013).await;
    }
  }))
  .into()],
  on_play: None
});
