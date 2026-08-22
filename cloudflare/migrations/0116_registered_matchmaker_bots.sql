-- The source ranked/PvP bot path selects real bot accounts, rather than the
-- ephemeral PRACTICE_BOT/WARM_UP opponent. Keep those accounts in the reserved
-- SYSTEM namespace so they can accumulate source-compatible ranked stats while
-- remaining absent from login, social, leaderboard, referral, and reward
-- surfaces. ENABLE_RANKED_BOTS remains the independent runtime activation gate.
CREATE TABLE registered_matchmaker_bots (
  user_id TEXT PRIMARY KEY,
  source_index INTEGER NOT NULL UNIQUE CHECK (source_index BETWEEN 1 AND 308),
  source_name TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL,
  CHECK (user_id = printf('system:bot:%04d', source_index))
);

CREATE INDEX registered_matchmaker_bots_enabled_idx
  ON registered_matchmaker_bots(enabled, source_index);

-- This is the exact 308-name source pool from
-- 30000000000314_bot_players.sql. The account-facing aliases are internal and
-- collision-proof; matches expose source_name, preserving the original bot
-- identity without reserving human Cloud Weasel usernames.
WITH indexed AS (
  SELECT CAST(key AS INTEGER) + 1 AS source_index,
         value AS source_name
  FROM json_each(
    '["BlazeHunter","crimsonfury11","darkwidow","doombringer60","_ironfalcon","lunareclipse39","LunarShadow","mysticfury","neonspectre","nightshade65","novastrike","pixelprowler","quantumblaze","rapidfire","roguegamer_","shadowslay3r_","shadowstrikex","soulreaper96","venom0us_","_viperbyte","vortex_","whitewid0w","StarGazer79_","crimsonninja72","s0ulstriker","phoenixrising","fluffypanda24","mightymage_7","blazeofglory","shadowwanderer_","quicksilver91","__thund3rbolt__","thejokerreturns","_frostbyte","DragonSorcerer99","mysticaldreamer53","snarkykitten_","_elementalforce","sapphiredawn_","ChaosTheory87_","songbirdserenade","steelsamurai","stormyknight87","s1lverf0x7","dragonwings99","tinkrb3ll","darkloremaster","cardz4life39","ne0phytex","spArKleNinja","maverick_cardsmith69","caff3inatedpanda","enigmaplaysxxx","theJok3rFool","aquamystic7727","scribeofdragons57","z3r0gravity","p0larbeargambit","_moonlitserenade78","ghostly_gauntlet","r3trogamergal","pixelmage76","emberflare","doodleduelist","oracleeyesx33","silentstrategist_","_crystalcaster_","TheCardboardKing","stormbr3ak3r_76","LostInTactics","caram3lrainbow","stealthyshuffler_","SnickerdoodleMaster","thecardmage","_d4rkKniGht","rainbowSparkles_9","shadowblade67","cardzilla","ccgenthusiast","_electriceel95","emeraldwarrior","blazingphoenix","aceofspades25","noodleninja","_slytherinwizard18","elementalchaos","cardcollectorx95","maverickjoker_","SilverDragonfly","cardwhisperer96","StarstruckSorcerer_","NeonNinja74","FrostedFire_","captaincardboard_","frostbitemage","BlackLotusMaster_3","MysticWanderer","_thewiseowl","midnightGambit","cardshark101","_serendipityace_","SilverStorm22xXx","cardsharkx_","thunderbolt88","lady__luck","MagicMage00715","aceofspades1903","darkknightrises","gamergirl123","StrategyMaster_","_shadowblade","dragontamer99","jazzhands_","BlueEyesWhiteDragon","enigmacollector","elementalwizard64","_cardgamechamp_","CardCrafter69","stardustknight","serendipityx85","mysticmind","dracolord","cosmicjoker33","IcySerenade","steelhearted","slyfoxgamer","melodymage","_blazingdragon","pixelninja","galacticwizard","thesilentstrategist","dreamweaver12","thecardshuffler","aquamarinequeen","vortexviper","_whizkid93","phoenixrider","enigmaenchanter","luckyduck88xxx","infernofury","wizenedwarrior_","_leafygreen","crypticconundrum","celestialoracle","stealthysniper_","tempeststorm","thejesterknight","ShadowMage74","CardMasterX","fireninja113","thedeckbuilder_","magicmunchkin","_dragonslayer5000_","elementalenigma","tcgguru","sneakyscribe","DeckedOutDuchess","redraptor17","cardcollector123","boltzblast","EnchantedEmber31","_luckylizard22","nightshadenecromancer","mastermindmindflayer","SolarStormer_","cardcrafterxavier_","shadowmancer87","LunaSparkle","dragontamerx","serenitywhisper_","chaosFury_","jazzypanda","mystickoi","electricsorcerer","frostbiteninja","_professorriddles_","whisperingwillow_","ironcladwarrior21","quillmaster14","technooblet","silverarrow76","midnightrider38","enchantedlotus","cardshark007","_celestialdreamer","roguerabbit","theartfuldodger59","StarlightGazer16","_fieryphoenix","shadyshadows","pixelKnight","blazingthunder","zephyrsailor","viperstrike40","warlordx_","shadowslayer58","_venomousfang_65","steelreaper","crimsonspartanxxx","deathstroke_44","infernoblade_","thunderstormx","nightshadeassassin12","battlebrawler21","RavageRaptor","ironcrusher","chaosblade1","darkvengeance","SavageWraith68","_skullcrusher","midnightreign64","StormbringerX","phantomstriker3","blazefury_xxx5","deathbringer1842","hellfirebane","apexpredator_","bloodthorn","silentassault","warhammerx94","venomousvixen_","blissfulsoul35","_SunshineGlow","serenewhisper84","harmonydreamer","gratefulheart","_radiantsmiles","tranquilwanderer","zenseeker","JoyfulJourney","mysticbreeze_","sacredgarden","serendipityspark","innerpeacekeeper","angelicaura","brightspirit_","LovingLight","happychimes","soulfuldancer_","BlessedHarmony","evergrateful","AngelWings","joyoussoul","PeacefulGlow","harmonioushearts","divinewhisper_","blissfuldreamer","radiantenergy","purehearted82","tranquiloasis","smilingserenity","bytewizard_","codeninja_","TechSavvy123","pixelpirate","_BinaryGuru","geekygamer","CyberSleuth","bytemaster","TechWhizKid","datadynamo_","pixelpusher","Hacksmith","CtrlAltDelight_","CodeCrusader","bytebender","techjunkie_","digitaldiva","logiclion72","pixelprodigy29","cyberwanderer_21","bytebeast","_techhacker_","codeslinger_","pixelenigma_","binarybot_","techwhisperer","DataDuchessxXx","hackhustler_","_ctrlalttech","pixelmaestro","DungeonMasterX_","spellweaver","DragonbornHero","roguerider","bardictales","sorcerersscroll","elvenarcher","warlockwanderer","DwarvenDelver71","rangersresolve_","_clericoflight","WizardWhisperer","halflinghavoc","barbarianbrawn","druidicdreamer_","tieflingtamer","MageMystic","gnomegambit","fightersfury23","rogueroller_","divinechampion_","sorceresssong_87","_bardicjourney_21","elvenenigma_","WarlockWill_","rangersreckoning","wizardswit_"]'
  )
)
INSERT INTO registered_matchmaker_bots
  (user_id, source_index, source_name, enabled, created_at)
SELECT printf('system:bot:%04d', source_index), source_index, source_name, 1,
       '2020-01-01T00:00:00.000Z'
FROM indexed;

CREATE TRIGGER registered_matchmaker_bots_identity_no_update
BEFORE UPDATE OF user_id, source_index, source_name ON registered_matchmaker_bots
BEGIN
  SELECT RAISE(ABORT, 'registered bot identity is immutable');
END;

CREATE TRIGGER registered_matchmaker_bots_no_delete
BEFORE DELETE ON registered_matchmaker_bots
BEGIN
  SELECT RAISE(ABORT, 'registered bot registry is immutable');
END;

-- Extend the 0114 allocation-class invariant narrowly: ordinary matches may
-- contain PLAYER users, nullable ephemeral bots, or an explicitly registered
-- SYSTEM bot. Other SYSTEM accounts remain restricted to readiness drills.
DROP TRIGGER multiplayer_matches_user_kind_insert_guard;

CREATE TRIGGER multiplayer_matches_user_kind_insert_guard
BEFORE INSERT ON multiplayer_matches
WHEN (
  substr(NEW.proposal_id, 1, length('readiness-drill-match-')) =
    'readiness-drill-match-'
  AND (
    NEW.player1_user_id IS NULL OR NEW.player2_user_id IS NULL
    OR (SELECT user_kind FROM users WHERE id = NEW.player1_user_id)
      IS NOT 'SYSTEM'
    OR (SELECT user_kind FROM users WHERE id = NEW.player2_user_id)
      IS NOT 'SYSTEM'
  )
) OR (
  substr(NEW.proposal_id, 1, length('readiness-drill-match-')) <>
    'readiness-drill-match-'
  AND (
    (
      NEW.player1_user_id IS NOT NULL
      AND (SELECT user_kind FROM users WHERE id = NEW.player1_user_id)
        IS NOT 'PLAYER'
      AND NOT EXISTS (
        SELECT 1 FROM registered_matchmaker_bots
        WHERE user_id = NEW.player1_user_id AND enabled = 1
      )
    )
    OR (
      NEW.player2_user_id IS NOT NULL
      AND (SELECT user_kind FROM users WHERE id = NEW.player2_user_id)
        IS NOT 'PLAYER'
      AND NOT EXISTS (
        SELECT 1 FROM registered_matchmaker_bots
        WHERE user_id = NEW.player2_user_id AND enabled = 1
      )
    )
  )
)
BEGIN
  SELECT RAISE(ABORT, 'match participant class does not match allocation path');
END;
