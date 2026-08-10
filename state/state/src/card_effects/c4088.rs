use super::effect_helpers::*;

intrinsic_effect!(Effect::Unit {
  triggers: vec![unit_summon!(|game, my_id| Box::pin(async move {
    let owner = game.owner(my_id);
    if game.player(owner).mana == 0 {
      game
        .draw_low_cost(owner, (owner, Zone::Hand { public: false }), |c, _| {
          c.element == Element::Water && c.is_spell()
        })
        .await;
    } else {
      // it feels better to not try conjuring if we have lead.
      game
        .draw_low_cost_spell_onto(my_id, |c, _| c.element == Element::Water)
        .await;
    }
  }))
  .into()],
  on_play: None
});
