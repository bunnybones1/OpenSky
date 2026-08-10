use super::effect_helpers::*;

intrinsic_effect!(effect_while_attached!(CardEffect::Hexheart));

attachable_effect!(
  struct Hexheart;,
  HEXHEART,
  Effect::Unit {
    on_play: None,
    triggers: vec![PhaseModifier {
      effect_type: EffectType::Continuous,
      priority: -1,
      is_active: is_on_field_not_silenced,
      run: |game, my_id, phase, _| Box::pin(async move {
        let my_attach = my_id.instance(game, None).unwrap().attachment();
        if let Ok(PhaseMoveToZone { card, zone, player }) = <&_>::try_from(phase) {
          if card.id() == my_attach
            || (card.id() == Some(my_id) && (zone.is_public_dust() || zone.is_graveyard()))
          {
            return Some(PhaseCancelled.into());
          }
          if let Zone::Attachment { parent } = zone {
            if parent.id() == Some(my_id) {
              // If something is trying to attach itself over me,
              // Dust it instead!
              return Some(
                PhaseMoveToZone {
                  card: *card,
                  zone: Zone::Dust { public: true },
                  player: *player,
                }
                .into(),
              );
            }
          }
        }
        None
      }),
    }
    .into()]
  }
);
