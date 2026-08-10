use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_death!(|game, my_id, _phase| Box::pin(async move {
    let damage = 2;
    let owner = game.owner(my_id);
    let enemy_player = enemy(owner);
    let targets_to_damage = game.units(enemy_player);

    game.damage_many(&targets_to_damage, damage, my_id).await;

    let fireball = game.create_card(owner, BaseCard::C20018).await;
    game.move_to_zone(fireball, Zone::Deck).await;
  }))
  .into()],
  on_play: None
});
