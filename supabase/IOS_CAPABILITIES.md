# iOS — activer Sign in with Apple + Push (obligatoire pour le build 1.0.8+)

Le build EAS échoue si le **Provisioning Profile** n’inclut pas encore ces capabilities.

## 1. Apple Developer (Identifiers)

1. Ouvrir [developer.apple.com/account/resources/identifiers](https://developer.apple.com/account/resources/identifiers/list)  
2. App ID **`com.appigeek.reader`**  
3. Activer :
   - **Sign In with Apple**
   - **Push Notifications**
4. Enregistrer

## 2. Régénérer le profil EAS (sur votre PC, interactif)

```powershell
cd "c:\Users\doria\Appy Geek"
npx eas-cli credentials -p ios
```

Choisir le profil **production** → **Provisioning Profile** → **Delete** / **Set up a new one** (pour qu’EAS recrée un profil avec les nouvelles capabilities).

## 3. Relancer le build

```powershell
npx eas-cli build --platform ios --profile production --auto-submit --non-interactive
```

## 4. Supabase Auth Apple

Voir [README.md](./README.md) — provider Apple + **Client IDs** = Bundle ID `com.appigeek.reader` (pas de Services ID / `.p8` pour le natif seul).
