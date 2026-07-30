# Emails FidexaPay — Supabase Auth

Configurer dans **Supabase Dashboard → Authentication → Email Templates**.

Ajouter aussi l’URL de redirection mot de passe :
**Authentication → URL Configuration → Redirect URLs**
- `http://localhost:8080/auth/reset-password`
- `https://votre-domaine.com/auth/reset-password`

---

## Confirm signup

**Subject:** Bienvenue sur FidexaPay — Confirmez votre email

**Body (HTML):**

```html
<h2 style="color:#6366f1;font-family:sans-serif">Bienvenue sur FidexaPay</h2>
<p>Bonjour,</p>
<p>Merci de rejoindre FidexaPay — la plateforme qui sécurise vos paiements Mobile Money en escrow.</p>
<p><a href="{{ .ConfirmationURL }}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Confirmer mon email</a></p>
<p style="color:#64748b;font-size:12px">Si vous n'avez pas créé de compte, ignorez ce message.</p>
<p>— L'équipe FidexaPay<br>contact@fidexapay.com</p>
```

---

## Reset password

**Subject:** FidexaPay — Réinitialisation de mot de passe

```html
<h2 style="color:#6366f1;font-family:sans-serif">Réinitialiser votre mot de passe</h2>
<p>Vous avez demandé à réinitialiser votre mot de passe FidexaPay.</p>
<p><a href="{{ .ConfirmationURL }}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Choisir un nouveau mot de passe</a></p>
<p style="color:#64748b;font-size:12px">Ce lien expire sous 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
<p>— FidexaPay Support</p>
```

---

## Magic link (optionnel)

**Subject:** Votre lien de connexion FidexaPay

Même style avec `{{ .ConfirmationURL }}`.

---

## Notifications in-app (retraits, commandes)

Gérées par la table `notifications` — pas par email Supabase Auth pour l’instant.
Phase 2 : Edge Function + Resend/SendGrid pour emails transactionnels.
