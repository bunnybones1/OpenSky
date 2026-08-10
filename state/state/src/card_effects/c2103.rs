use super::effect_helpers::*;

intrinsic_effect!(Effect::Spell {
  triggers: vec![],
  on_play: OnPlayEffect::Targeted {
    does_target: targets::any_hero,
    mutate: |game, _, target, owner| {
      Box::pin(async move {
        let ally_elements: Vec<_> = game
          .units::<&CardInstance<SkyWeaver>>(game.owner(target))
          .into_iter()
          .map(|c| c.element)
          .unique()
          .collect();

        for e in ally_elements {
          let rune = match e {
            Element::Water => BaseCard::C4031,
            Element::Earth => BaseCard::C86,
            Element::Dark => BaseCard::C3061,
            Element::Fire => BaseCard::C1081,
            Element::Metal => BaseCard::C60,
            Element::Mind => BaseCard::C2087,
            Element::Air => BaseCard::C1072,
            Element::Light => BaseCard::C3035,
            _ => continue,
          };

          let card = game.create_card(owner, rune).await;
          game.move_to_zone(card, Zone::Hand { public: true }).await;
        }
      })
    },
  }
});
