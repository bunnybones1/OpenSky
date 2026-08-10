#[macro_use]
extern crate criterion;
use criterion::Criterion;

extern crate skyweaver_rs;
mod common;

use common::test_store;
use skyweaver_rs::*;

fn criterion_benchmark(c: &mut Criterion) {
  c.bench_function("arcadeum end turns", |b| {
    let mut game = test_store().should_log(false).build().auto_mulligan();
    b.iter(|| {
      game.apply_ok(Some(0), PlayerAction::EndTurn);
      game.apply_ok(Some(1), PlayerAction::EndTurn);
    })
  });
}

criterion_group!(benches, criterion_benchmark);
criterion_main!(benches);
