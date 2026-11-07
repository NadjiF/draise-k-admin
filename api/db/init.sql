-- Initialisation de la base du back-office de La Draise-K.
-- Exécuté automatiquement par PostgreSQL au premier démarrage du conteneur.
-- Données reprises de draise-k/data/pieces.json.

BEGIN;

CREATE TABLE pieces (
  id            text    PRIMARY KEY
                CHECK (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nom           text    NOT NULL CHECK (btrim(nom) <> ''),
  categorie     text    NOT NULL
                CHECK (categorie IN ('freinage', 'transmission', 'pneus-chambres',
                                     'eclairage', 'accessoires')),
  prix_centimes integer NOT NULL CHECK (prix_centimes > 0),
  description   text    NOT NULL,

  -- Compatibilités : NULL = la pièce ne dépend pas de ce critère
  tailles_roue  text[]
                CHECK (cardinality(tailles_roue) > 0
                       AND tailles_roue <@ ARRAY['20','24','26','27.5','29','700c']),
  types_frein   text[]
                CHECK (cardinality(types_frein) > 0
                       AND types_frein <@ ARRAY['v-brake','etrier',
                                                'disque-mecanique','disque-hydraulique']),
  -- Vitesses de 1 à 13, comme la validation de l'API (piece.schema.ts).
  -- <@ (« est contenu dans ») refuse aussi un élément NULL, contrairement à 0 < ALL (…).
  vitesses      integer[]
                CHECK (cardinality(vitesses) > 0
                       AND vitesses <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13])
);

INSERT INTO pieces
  (id, nom, categorie, prix_centimes, description, tailles_roue, types_frein, vitesses)
VALUES
  -- Freinage
  ('plaquettes-disque-resine', 'Plaquettes de frein à disque résine', 'freinage', 1290,
   'Paire de plaquettes organiques, freinage progressif et silencieux. Format compatible étriers Shimano 2 pistons.',
   NULL, ARRAY['disque-mecanique', 'disque-hydraulique'], NULL),
  ('patins-v-brake', 'Patins de frein V-Brake', 'freinage', 990,
   'Lot de 2 paires de patins 70 mm à tige filetée, gomme adaptée aux jantes aluminium.',
   NULL, ARRAY['v-brake'], NULL),
  ('disque-frein-160mm', 'Disque de frein 160 mm 6 trous', 'freinage', 2490,
   'Disque acier inoxydable 160 mm, fixation 6 trous, vis fournies.',
   NULL, ARRAY['disque-mecanique', 'disque-hydraulique'], NULL),
  ('kit-cable-gaine-frein', 'Kit câbles et gaines de frein', 'freinage', 1490,
   'Kit avant et arrière : 2 câbles inox, 3 m de gaine et embouts. Pour freins à commande par câble.',
   NULL, ARRAY['v-brake', 'etrier', 'disque-mecanique'], NULL),

  -- Transmission
  ('chaine-11v', 'Chaîne 11 vitesses', 'transmission', 3290,
   'Chaîne 116 maillons avec attache rapide, traitement anti-corrosion.',
   NULL, NULL, ARRAY[11]),
  ('cassette-10v-11-32', 'Cassette 10 vitesses 11-32', 'transmission', 4490,
   'Cassette acier 11-32 dents pour corps de roue libre Shimano HG, étagement polyvalent route et VTC.',
   NULL, NULL, ARRAY[10]),
  ('derailleur-arriere-9v', 'Dérailleur arrière 9 vitesses', 'transmission', 3990,
   'Dérailleur chape longue, capacité jusqu''à 36 dents, fixation directe sur patte de cadre.',
   NULL, NULL, ARRAY[9]),
  ('plateau-mono-32d', 'Plateau mono 32 dents narrow-wide', 'transmission', 2990,
   'Plateau aluminium à dents alternées pour transmission mono-plateau, fixation BCD 104.',
   NULL, NULL, ARRAY[10, 11, 12]),
  ('chaine-9v', 'Chaîne 9 vitesses', 'transmission', 1990,
   'Chaîne 114 maillons avec attache rapide, traitement anti-corrosion.',
   NULL, NULL, ARRAY[9]),
  ('cassette-9v-11-34', 'Cassette 9 vitesses 11-34', 'transmission', 2990,
   'Cassette acier 11-34 dents pour corps de roue libre Shimano HG, adaptée au dérailleur 9 vitesses (capacité 36 dents).',
   NULL, NULL, ARRAY[9]),
  ('cassette-11v-11-34', 'Cassette 11 vitesses 11-34', 'transmission', 6490,
   'Cassette acier 11-34 dents pour corps de roue libre Shimano HG 11 vitesses, large plage pour route et gravel.',
   NULL, NULL, ARRAY[11]),

  -- Pneus et chambres
  ('pneu-route-700x28', 'Pneu route 700x28', 'pneus-chambres', 4490,
   'Pneu tringle souple avec bande anti-crevaison, bon compromis rendement et confort.',
   ARRAY['700c'], NULL, NULL),
  ('pneu-vtt-29x2-30', 'Pneu VTT 29x2.30 Tubeless Ready', 'pneus-chambres', 5490,
   'Pneu tout-terrain à crampons polyvalents, montage tubeless ou avec chambre à air.',
   ARRAY['29'], NULL, NULL),
  ('chambre-air-26', 'Chambre à air 26x1.75-2.125', 'pneus-chambres', 690,
   'Chambre en butyle, valve Schrader 40 mm.',
   ARRAY['26'], NULL, NULL),
  ('chambre-air-700c-presta', 'Chambre à air 700x25-32 Presta', 'pneus-chambres', 790,
   'Chambre en butyle, valve Presta 48 mm, pour pneus route et ville de 25 à 32 mm.',
   ARRAY['700c'], NULL, NULL),
  ('chambre-air-29', 'Chambre à air 29x2.10-2.40', 'pneus-chambres', 890,
   'Chambre en butyle, valve Presta 48 mm, pour pneus VTT de 2.10 à 2.40 pouces.',
   ARRAY['29'], NULL, NULL),
  ('kit-reparation-crevaison', 'Kit de réparation crevaison', 'pneus-chambres', 790,
   'Rustines autocollantes et classiques, dissolution, râpe et 2 démonte-pneus.',
   NULL, NULL, NULL),

  -- Éclairage
  ('kit-eclairage-usb', 'Kit éclairage avant/arrière USB', 'eclairage', 2990,
   'Phare 200 lumens et feu arrière rechargeables par USB-C, fixation élastique sans outil.',
   NULL, NULL, NULL),
  ('phare-avant-800lm', 'Phare avant 800 lumens', 'eclairage', 5990,
   'Phare rechargeable avec faisceau anti-éblouissement, 5 modes et jusqu''à 2 h en pleine puissance.',
   NULL, NULL, NULL),
  ('feu-arriere-led', 'Feu arrière LED', 'eclairage', 1990,
   'Feu arrière rechargeable, visible à 500 m, fixation tige de selle.',
   NULL, NULL, NULL),
  ('roue-avant-dynamo-700c', 'Roue avant 700c à moyeu dynamo', 'eclairage', 11990,
   'Roue montée avec moyeu dynamo 6 V / 3 W pour un éclairage sans batterie. Jante pour freins à patins.',
   ARRAY['700c'], ARRAY['v-brake', 'etrier'], NULL),

  -- Accessoires
  ('antivol-u', 'Antivol en U', 'accessoires', 4490,
   'Antivol en acier trempé 14 mm, support de cadre et 2 clés fournis.',
   NULL, NULL, NULL),
  ('pompe-a-pied', 'Pompe à pied avec manomètre', 'accessoires', 3490,
   'Pompe jusqu''à 11 bars, embout double compatible valves Presta et Schrader.',
   NULL, NULL, NULL),
  ('porte-bidon-alu', 'Porte-bidon aluminium', 'accessoires', 890,
   'Porte-bidon léger pour bidons standards, vis de fixation incluses.',
   NULL, NULL, NULL),
  ('sacoche-selle', 'Sacoche de selle 0,8 L', 'accessoires', 1990,
   'Sacoche déperlante avec fixation à scratch, idéale pour chambre à air et outils.',
   NULL, NULL, NULL);

COMMIT;
