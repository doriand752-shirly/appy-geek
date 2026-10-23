# Appigeek — Supabase (Phase 1)

## Scripts SQL à exécuter (SQL Editor)

**Recommandé :** coller / exécuter `APPLY_ALL.sql` en une fois  
(ou séparément : `article_comments.sql` → `user_sync.sql` → `comment_reports.sql` → **`admin_featured.sql`**).

Si la base est déjà à jour (commentaires / sync / reports), exécutez seulement :

```text
supabase/admin_featured.sql
```

Lien direct : [SQL Editor](https://supabase.com/dashboard/project/ppnejmwvmkqnmrzcivqs/sql/new)

### Admin in-app + « À la une »

1. Exécuter `admin_featured.sql` (tables `admin_users`, `featured_articles`, RPCs admin, lecture des signalements pour admins).
   - La policy `featured_articles_select_active` + `grant select … to anon, authenticated` permet à **tous** les utilisateurs (y compris anonymes) de lire les articles actifs « À la une ».
2. Se connecter une fois dans l’app avec **Sign in with Apple**.
3. Dans SQL Editor, retrouver son `auth.users` id :

```sql
select id, email, created_at from auth.users order by created_at desc limit 10;
```

4. Enregistrer le premier admin :

```sql
insert into public.admin_users (user_id, note)
values ('VOTRE-UUID-ICI', 'Dorian')
on conflict (user_id) do nothing;
```

5. Dans l’app : **Paramètres** → appui long **5 fois** sur le logo / version en bas → écran Administration (si le compte est dans `admin_users`).

Fonctions admin livrées : articles à la une, file de signalements, stats rapides, déclenchement test digest-push.

## Push / APNs (EAS)

Le build iOS peut réussir avec l’entitlement Push, mais **Expo Push** nécessite une clé APNs (`.p8`) sur le projet EAS.

Vérifié côté API Expo : `pushKey` est actuellement **null**.

Étape interactive (une fois) :

```powershell
cd "c:\Users\doria\Appy Geek"
npx eas-cli credentials -p ios
```

Profil **production** → **Push Notifications** → **Set up** / upload Apple Push Key (`.p8` depuis [Apple Developer → Keys](https://developer.apple.com/account/resources/authkeys/list) avec Push Notifications).

## Auth Apple (Supabase Dashboard)

Appigeek utilise **Sign in with Apple natif** (`expo-apple-authentication` → `signInWithIdToken`). Pas de flux OAuth web.

1. Apple Developer → Identifiers → App ID **`com.appigeek.reader`** → activer **Sign In with Apple**  
2. Supabase → Authentication → Providers → **Apple** → Enable  
3. Dans **Client IDs** (parfois libellé Services ID) : saisir uniquement le Bundle ID **`com.appigeek.reader`** (séparer par virgule si plusieurs)  
4. **Ne pas** renseigner Services ID web / Team ID / Key ID / clé `.p8` tant que vous n’avez pas de connexion Apple sur le web (OAuth). Ces champs sont pour le flux web uniquement.

Voir aussi [docs Supabase — native Expo](https://supabase.com/docs/guides/auth/social-login/auth-apple#configuration-expo-native).

## Sécurité / RGPD

Exécuter `security_rgpd.sql` (rate-limit commentaires, masquage `author_token`, RPC admin digest, `purge_my_account_data`).

Puis déployer les Edge Functions :

```bash
supabase functions deploy digest-push
supabase functions deploy article-summary
supabase functions deploy delete-account
```

### Secret digest-push (obligatoire)

1. Générer un secret long (≥ 24 caractères).
2. SQL Editor :

```sql
select vault.create_secret('VOTRE_SECRET', 'digest_push_secret');
```

3. Edge Secrets : `DIGEST_PUSH_SECRET` = la même valeur.

4. Réappliquer `digest_push_cron.sql` (envoie `x-digest-secret`).

Sans ce secret, le cron et l’admin ne peuvent plus déclencher les digests (401).

### Compte

- Paramètres → **Supprimer mon compte** → Edge `delete-account` (JWT + purge + `auth.admin.deleteUser`).
- Politique : https://doriand752-shirly.github.io/appy-geek/privacy.html

## Edge Function digest-push

```bash
supabase functions deploy digest-push
```

Secrets (Dashboard → Edge Functions → Secrets, ou CLI) :

- `SUPABASE_URL` (souvent injecté)
- `SUPABASE_SERVICE_ROLE_KEY`
- `DIGEST_PUSH_SECRET` (obligatoire — voir ci-dessus)
- `EXPO_ACCESS_TOKEN` (optionnel — [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens))

### Planning (Europe/Paris)

Exécuter `digest_push_cron.sql` dans le SQL Editor (désactive l’ancien `*/30` et crée `digest-push-paris`).

| Heure Paris | Slot | Contenu |
|-------------|------|---------|
| 08:00 | `morning` | Titres des nouveaux articles |
| 13:00 | `midday` | Titres des nouveaux articles |
| 18:00 | `evening` | Rappel lecture (pas de scan RSS) |

Le cron tourne **chaque heure UTC** et n’appelle la fonction que si l’heure `Europe/Paris` est 8, 13 ou 18 (DST-safe).

Invocation manuelle : `POST /functions/v1/digest-push?slot=morning|midday|evening`

Comportement :

- Users connectés avec `push_digest_enabled` + token Expo + abonnements  
- Anti-doublon ~2 h entre envois (évite un double déclenchement du même créneau)  
- Premier passage par flux : ne compte que les articles récents (~2 h), pas tout l’historique

## App

Variables déjà dans `app.json` → `extra.supabaseUrl` / `supabaseAnonKey` (ou `EXPO_PUBLIC_*`).

Plugins Expo : `expo-apple-authentication`, `expo-notifications`, `ios.usesAppleSignIn: true`.

## Build TestFlight 1.0.8+

Si EAS échoue avec *Provisioning profile doesn't support Push Notifications and Sign in with Apple*, suivez **[IOS_CAPABILITIES.md](./IOS_CAPABILITIES.md)** puis relancez le build.
