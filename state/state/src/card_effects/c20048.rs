use super::effect_helpers::*;

intrinsic_effect!(Effect::Enchant {
  on_attach: |parent, attach| {
    parent.add_modifier(
      attach.id(),
      1,
      Modifier::Silenced(true),
      ModifierExpiry::Never { copyable: false },
    );
  },

  on_detach: |parent, attach| {
    parent.remove_modifiers_from(attach.id());
  },
});

#[test]
fn copy_a_unit_with_stealth_doesnt_copy_silence_status_effect() -> Result<(), String> {
  run_test(|mut game| {
    Box::pin(async move {
      let id = game
        .instantiate_and_summon(0, BaseCard::Dummy)
        .await
        .unwrap();
      game.give_spell(id, enchant::SILENCE).await;
      game.resolve_triggers().await;
      assert!(id.instance(&game, None).unwrap().is_silenced);

      let without_spell = game.copy_card(id, false).await.id().unwrap();
      let with_spell = game.copy_card(id, true).await.id().unwrap();

      let spell = game
        .reveal_from_card(with_spell, |c| c.attachment.map(|c| c.id()))
        .await
        .unwrap();
      // remove Silence
      game.dust(spell).await;

      game.resolve_triggers().await;

      assert!(!without_spell.instance(&game, None).unwrap().is_silenced,);
      // Not a deep copy, & the base didn't have Silence, so it shouldn't be silenced.
      assert!(!with_spell.instance(&game, None).unwrap().is_silenced);
    })
  })
}
