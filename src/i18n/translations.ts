import type { AppLocale } from './types';

export type TranslationParams = Record<string, string | number>;

export type TranslationKey =
  | 'brand.tagline'
  | 'common.cancel'
  | 'common.confirm'
  | 'common.ok'
  | 'common.remove'
  | 'common.error'
  | 'common.retry'
  | 'common.refresh'
  | 'common.loading'
  | 'common.add'
  | 'tabs.home'
  | 'tabs.themes'
  | 'tabs.discussions'
  | 'tabs.discover'
  | 'tabs.subscriptions'
  | 'tabs.settings'
  | 'themes.subtitle'
  | 'home.updatedAt'
  | 'home.offlineSyncing'
  | 'home.byTheme'
  | 'home.hide'
  | 'home.showExtras'
  | 'home.hideExtras'
  | 'home.noThemesSelected'
  | 'home.chooseThemes'
  | 'home.themeHintEmpty'
  | 'home.feed'
  | 'home.unreadCount'
  | 'home.searchInFeed'
  | 'home.searchArticles'
  | 'home.markAllReadTitle'
  | 'home.markAllReadMessage'
  | 'home.loadingArticles'
  | 'home.refreshing'
  | 'home.emptyNoFeeds'
  | 'home.emptyNoFavorites'
  | 'home.emptyAllRead'
  | 'home.emptyFeedSearch'
  | 'home.emptySearch'
  | 'home.emptyDefault'
  | 'discover.title'
  | 'discover.subtitle'
  | 'subscriptions.title'
  | 'subscriptions.subtitle'
  | 'subscriptions.addFeed'
  | 'subscriptions.feedTitle'
  | 'subscriptions.feedUrl'
  | 'subscriptions.add'
  | 'subscriptions.yourFeeds'
  | 'subscriptions.empty'
  | 'subscriptions.importOpml'
  | 'subscriptions.exportOpml'
  | 'subscriptions.resetDefaults'
  | 'subscriptions.resetConfirmTitle'
  | 'subscriptions.resetConfirmMessage'
  | 'subscriptions.invalidUrlTitle'
  | 'subscriptions.invalidUrlMessage'
  | 'subscriptions.removeFeedTitle'
  | 'subscriptions.exportUnavailable'
  | 'subscriptions.exportFailed'
  | 'subscriptions.importFailed'
  | 'subscriptions.importSuccess'
  | 'subscriptions.defaultFeedName'
  | 'discussions.title'
  | 'discussions.subtitle'
  | 'discussions.unavailable'
  | 'discussions.retryHint'
  | 'discussions.empty'
  | 'discussions.articleFallback'
  | 'settings.title'
  | 'settings.subtitle'
  | 'settings.section.account'
  | 'settings.section.appearance'
  | 'settings.section.home'
  | 'settings.section.reading'
  | 'settings.section.offline'
  | 'settings.section.language'
  | 'settings.section.about'
  | 'settings.chooseTheme'
  | 'settings.chooseFontSize'
  | 'settings.languageHint'
  | 'settings.localeChangeTitle'
  | 'settings.localeChangeMessage'
  | 'settings.localeChangeConfirm'
  | 'settings.addRecommendedFeeds'
  | 'settings.loginRequired'
  | 'settings.fontSizeReader'
  | 'settings.fontSizeBodyPt'
  | 'settings.adminOpen'
  | 'settings.appleSignIn'
  | 'settings.appleSignedIn'
  | 'settings.appleHintSignIn'
  | 'settings.appleHintSignedIn'
  | 'settings.appleAccount'
  | 'settings.appleUnavailable'
  | 'settings.pushAlerts'
  | 'settings.pushEnabled'
  | 'settings.pushDisabled'
  | 'settings.pushNeedSignIn'
  | 'settings.homeThemes'
  | 'settings.homeThemesNone'
  | 'settings.homeThemesCount'
  | 'settings.readerPreview'
  | 'settings.readerPreviewHint'
  | 'settings.readerFull'
  | 'settings.readerFullHint'
  | 'settings.fontSize'
  | 'settings.offlineCache'
  | 'settings.offlineCacheHint'
  | 'settings.offlineLimit'
  | 'settings.offlineLimitTitle'
  | 'settings.offlineArticles'
  | 'settings.clearCache'
  | 'settings.clearCacheTitle'
  | 'settings.clearCacheMessage'
  | 'settings.clearAndRefresh'
  | 'settings.noOfflineSaved'
  | 'settings.noOfflineSavedHint'
  | 'settings.commentPseudo'
  | 'settings.commentPseudoHint'
  | 'settings.commentPseudoSave'
  | 'settings.signOutTitle'
  | 'settings.signOutMessage'
  | 'settings.signOut'
  | 'settings.signOutFailed'
  | 'settings.deleteAccount'
  | 'settings.deleteAccountHint'
  | 'settings.deleteAccountTitle'
  | 'settings.deleteAccountMessage'
  | 'settings.deleteAccountConfirm'
  | 'settings.deleteAccountFailed'
  | 'settings.privacy'
  | 'settings.privacyHint'
  | 'settings.adminLoginRequired'
  | 'settings.adminDenied'
  | 'settings.adminCheckFailed'
  | 'settings.pushPermission'
  | 'settings.pushToken'
  | 'settings.pushSave'
  | 'settings.pushNoProject'
  | 'settings.pushNotDevice'
  | 'settings.pushGenericError'
  | 'settings.pushTestSent'
  | 'settings.pushTestSentHint'
  | 'settings.pushAlertsMenu'
  | 'settings.pushTest'
  | 'settings.pushDisable'
  | 'settings.pushActivated'
  | 'settings.pushActivatedHint'
  | 'settings.pushRegisterFailed'
  | 'settings.openSettings'
  | 'settings.version'
  | 'settings.syncNow'
  | 'settings.syncing'
  | 'toolbar.all'
  | 'toolbar.unread'
  | 'toolbar.favorites'
  | 'article.read'
  | 'article.linkUnavailable'
  | 'article.addFavorite'
  | 'article.removeFavorite'
  | 'article.openSource'
  | 'article.showFull'
  | 'article.openEmbed'
  | 'article.openVideoBrowser'
  | 'selection.exit'
  | 'selection.hint'
  | 'selection.markRead'
  | 'featured.title'
  | 'featured.badge'
  | 'featured.readCta'
  | 'featured.readArticleA11y'
  | 'recommendations.title'
  | 'saved.title'
  | 'saved.seeAll'
  | 'saved.empty'
  | 'comments.title'
  | 'comments.pseudoRequired'
  | 'comments.pseudoRequiredHint'
  | 'comments.emptyComment'
  | 'comments.sendFailed'
  | 'comments.deleteTitle'
  | 'comments.deleteFailed'
  | 'comments.reportTitle'
  | 'comments.reportMessage'
  | 'comments.report'
  | 'comments.reportThanks'
  | 'comments.reportThanksTitle'
  | 'comments.networkError'
  | 'selection.selectedCount'
  | 'comments.reportFailed'
  | 'comments.longPressDelete'
  | 'comments.longPressReport'
  | 'comments.pseudoPlaceholder'
  | 'comments.bodyPlaceholder'
  | 'comments.send'
  | 'comments.publish'
  | 'comments.disclaimer'
  | 'comments.loading'
  | 'comments.empty'
  | 'comments.unavailable'
  | 'comments.signInHint'
  | 'summary.title'
  | 'summary.generating'
  | 'summary.unavailable'
  | 'summary.retry'
  | 'summary.ai'
  | 'summary.local'
  | 'reader.listen'
  | 'reader.stopListen'
  | 'reader.openSafari'
  | 'reader.copyLink'
  | 'reader.openBrowser'
  | 'reader.share'
  | 'reader.proposeFeatured'
  | 'reader.more'
  | 'reader.jumpToDiscussion'
  | 'reader.addFavorite'
  | 'reader.removeFavorite'
  | 'reader.hintUseMenu'
  | 'reader.fetchingFull'
  | 'reader.preparing'
  | 'reader.excerptOnly'
  | 'reader.analyzingPage'
  | 'reader.formatting'
  | 'reader.previewUnavailable'
  | 'home.swipeTip'
  | 'home.swipeTipDismiss'
  | 'home.pickArticle'
  | 'feeds.loadError'
  | 'themePicker.intro'
  | 'themePicker.enableAll'
  | 'themePicker.disableAll'
  | 'themePicker.counter'
  | 'themePicker.warnNone'
  | 'themePicker.customSection'
  | 'themePicker.customHint'
  | 'themePicker.addTheme'
  | 'themePicker.myThemes'
  | 'themePicker.builtinSection'
  | 'themePicker.duplicateName'
  | 'themePicker.nameRequired'
  | 'themePicker.nameTooLong'
  | 'themePicker.maxThemes'
  | 'themePicker.removeTitle'
  | 'themePicker.removeMessage'
  | 'themePicker.removeConfirm'
  | 'themePicker.removeA11y'
  | 'themePicker.customPlaceholder'
  | 'themePicker.customMatchHint'
  | 'themePicker.builtinMatchHint'
  | 'toolbar.allSources'
  | 'toolbar.markAllRead'
  | 'article.markReadShort'
  | 'selection.select'
  | 'selection.deselect'
  | 'visualTheme.dark_default'
  | 'visualTheme.light'
  | 'visualTheme.ocean'
  | 'visualTheme.sunset'
  | 'visualTheme.forest'
  | 'settings.fontSmall'
  | 'settings.fontMedium'
  | 'settings.fontLarge'
  | 'settings.offlineCacheHintOn'
  | 'settings.offlineCacheHintOff'
  | 'settings.section.comments'
  | 'settings.section.danger'
  | 'settings.adminUnlockedHint'
  | 'settings.offlineArticlesListHint'
  | 'settings.offlineLimitDefault'
  | 'settings.signInFailed'
  | 'common.close'
  | 'nav.themeDefault'
  | 'nav.themePicker'
  | 'nav.offlineArticles'
  | 'nav.admin'
  | 'quickAction.homeTitle'
  | 'quickAction.homeSubtitle'
  | 'quickAction.discussionsTitle'
  | 'quickAction.discussionsSubtitle'
  | 'quickAction.feedsTitle'
  | 'quickAction.feedsSubtitle'
  | 'ad.label'
  | 'ad.hide'
  | 'ad.hideA11y'
  | 'ad.fallbackA11y'
  | 'comments.countNone'
  | 'comments.countOne'
  | 'comments.countMany'
  | 'discussions.viewComments'
  | 'discussions.loading'
  | 'themeArticles.unknown'
  | 'themeArticles.emptyFavorites'
  | 'themeArticles.emptyUnread'
  | 'themeArticles.emptyDefault'
  | 'offline.emptyHint'
  | 'saved.moreCount'
  | 'subscriptions.importEmpty'
  | 'subscriptions.importDone'
  | 'subscriptions.importAllPresent'
  | 'subscriptions.importFailedTitle'
  | 'subscriptions.importFailedMessage'
  | 'subscriptions.feedTitlePlaceholder'
  | 'subscriptions.feedUrlPlaceholder'
  | 'subscriptions.opmlSection'
  | 'subscriptions.catalogSearch'
  | 'subscriptions.removeA11y'
  | 'subscriptions.addA11y'
  | 'subscriptions.alreadyAddedA11y'
  | 'reader.linkUnsupported'
  | 'reader.linkOpenFailed'
  | 'reader.noArticleUrl'
  | 'reader.featuredProposedTitle'
  | 'reader.featuredProposedMessage'
  | 'reader.featuredProposeFailed'
  | 'reader.featuredProposeNeedSignIn'
  | 'reader.featuredProposeSignIn'
  | 'reader.appleSignInUnavailable'
  | 'reader.signInFailed'
  | 'reader.toggleWebUnderExcerptHide'
  | 'reader.toggleWebUnderExcerptShow'
  | 'reader.sendFailed'
  | 'reader.missingArticle'
  | 'reader.openExternalBrowser'
  | 'reader.sourceOfflineSaved'
  | 'reader.sourceFromPagePreview'
  | 'reader.sourceFromRssPreview'
  | 'reader.showFullArticle'
  | 'reader.backToPreview'
  | 'reader.sourceOfflineReading'
  | 'reader.sourceFromPageFull'
  | 'reader.sourceFromRssFull'
  | 'reader.extractFailed'
  | 'reader.openArticlePage'
  | 'reader.showPageInApp'
  | 'ad.fallbackTitle';

type Dictionary = Record<TranslationKey, string>;

const fr: Dictionary = {
  'brand.tagline': 'Votre veille geek, un flux à la fois',
  'common.cancel': 'Annuler',
  'common.confirm': 'Confirmer',
  'common.ok': 'OK',
  'common.remove': 'Retirer',
  'common.error': 'Erreur',
  'common.retry': 'Réessayer',
  'common.refresh': 'Actualiser',
  'common.loading': 'Chargement…',
  'common.add': 'Ajouter',
  'tabs.home': 'Accueil',
  'tabs.themes': 'Thèmes',
  'tabs.discussions': 'Discussions',
  'tabs.discover': 'Découvrir',
  'tabs.subscriptions': 'Abonnements',
  'tabs.settings': 'Paramètres',
  'themes.subtitle': 'Parcourez vos articles par thème.',
  'home.updatedAt': 'MAJ',
  'home.offlineSyncing': 'téléchargement des articles complets…',
  'home.byTheme': 'Par thème',
  'home.hide': 'Masquer',
  'home.showExtras': 'Hors ligne et suggestions',
  'home.hideExtras': 'Masquer hors ligne et suggestions',
  'home.noThemesSelected': 'Aucun thème sélectionné. Choisissez ceux à afficher dans l’onglet Thèmes.',
  'home.chooseThemes': 'Choisir les thèmes',
  'home.themeHintEmpty':
    'Les articles seront classés ici d’après leur titre (thèmes intégrés ou votre nom de thème personnalisé). Ajoutez des flux pour remplir l’accueil.',
  'home.feed': 'Fil d’actualité',
  'home.unreadCount': 'non lu',
  'home.searchInFeed': 'Rechercher dans {{feed}}…',
  'home.searchArticles': 'Rechercher un article…',
  'home.markAllReadTitle': 'Tout marquer comme lu',
  'home.markAllReadMessage': '{{count}} article dans cette liste ?',
  'home.loadingArticles': 'Chargement des articles…',
  'home.refreshing': 'Actualisation…',
  'home.emptyNoFeeds': 'Ajoutez votre premier flux dans « Abonnements ».',
  'home.emptyNoFavorites': 'Aucun favori pour l’instant.',
  'home.emptyAllRead': 'Tous les articles sont lus.',
  'home.emptyFeedSearch': 'Aucun article pour {{feed}}{{search}}.',
  'home.emptySearch': 'Aucun résultat pour cette recherche.',
  'home.emptyDefault': 'Aucun article pour le moment.',
  'discover.title': 'Découvrir',
  'discover.subtitle': 'Ajoutez des flux par thème geek — tech, jeux, science, pop culture.',
  'subscriptions.title': 'Abonnements',
  'subscriptions.subtitle': 'Découvrez des sources, gérez vos flux RSS et importez ou exportez une liste OPML.',
  'subscriptions.addFeed': 'Ajouter un flux',
  'subscriptions.feedTitle': 'Titre (optionnel)',
  'subscriptions.feedUrl': 'URL du flux RSS',
  'subscriptions.add': 'Ajouter',
  'subscriptions.yourFeeds': 'Vos flux ({{count}})',
  'subscriptions.empty': 'Aucun abonnement pour l’instant.',
  'subscriptions.importOpml': 'Importer OPML',
  'subscriptions.exportOpml': 'Exporter OPML',
  'subscriptions.resetDefaults': 'Réinitialiser les flux par défaut',
  'subscriptions.resetConfirmTitle': 'Réinitialiser les abonnements ?',
  'subscriptions.resetConfirmMessage':
    'Remplace vos abonnements par les flux recommandés pour votre langue. Les articles lus et favoris seront effacés.',
  'subscriptions.invalidUrlTitle': 'URL invalide',
  'subscriptions.invalidUrlMessage': 'Collez une adresse de flux RSS ou Atom valide (https://…).',
  'subscriptions.removeFeedTitle': 'Retirer ce flux ?',
  'subscriptions.exportUnavailable': 'Partage non disponible sur cet appareil.',
  'subscriptions.exportFailed': 'Réessayez dans un instant.',
  'subscriptions.importFailed': 'Fichier OPML illisible ou vide.',
  'subscriptions.importSuccess': '{{count}} flux importé(s).',
  'subscriptions.defaultFeedName': 'Flux RSS',
  'discussions.title': 'Discussions',
  'discussions.subtitle':
    'Articles commentés par la communauté Appigeek — ouvrez pour lire et répondre.',
  'discussions.unavailable': 'Les discussions seront disponibles prochainement.',
  'discussions.retryHint': 'Appuyez pour réessayer.',
  'discussions.empty': 'Aucune discussion pour l’instant. Commentez un article pour lancer un fil.',
  'discussions.articleFallback': 'Article',
  'settings.title': 'Paramètres',
  'settings.subtitle':
    'Comportement par défaut à l’ouverture d’un article (vous pouvez toujours basculer dans le lecteur).',
  'settings.section.account': 'Compte',
  'settings.section.appearance': 'Apparence',
  'settings.chooseTheme': 'Choisir un thème',
  'settings.chooseFontSize': 'Taille du texte',
  'settings.section.home': 'Accueil',
  'settings.section.reading': 'Lecture',
  'settings.section.offline': 'Hors ligne',
  'settings.section.language': 'Langue',
  'settings.section.about': 'À propos',
  'settings.languageHint': 'Interface et catalogue de flux recommandés.',
  'settings.localeChangeTitle': 'Changer de langue',
  'settings.localeChangeMessage':
    'Vos abonnements seront remplacés par les flux recommandés pour {{lang}}. Les articles en cache, lus et favoris seront effacés.',
  'settings.localeChangeConfirm': 'Changer de langue',
  'settings.addRecommendedFeeds': 'Ajouter les flux',
  'settings.loginRequired': 'Connexion requise',
  'settings.appleSignIn': 'Se connecter avec Apple',
  'settings.appleSignedIn': 'Connecté avec Apple',
  'settings.appleHintSignIn': 'Retrouvez vos abonnements et lus sur un autre iPhone.',
  'settings.appleHintSignedIn':
    'Abonnements, lus, favoris et pseudo synchronisés. Appuyez pour vous déconnecter.',
  'settings.appleAccount': 'Compte Apple',
  'settings.appleUnavailable': 'Compte cloud indisponible sur ce build.',
  'settings.pushAlerts': 'Alertes nouveaux articles',
  'settings.pushEnabled':
    'Activé — 8 h / 13 h / 18 h (titres d’articles, heure de Paris). Appuyez pour tester ou désactiver.',
  'settings.pushDisabled':
    'À 8 h, 13 h et 18 h : notification avec le titre d’un article (heure de Paris).',
  'settings.pushNeedSignIn': 'Connectez-vous avec Apple pour activer les alertes.',
  'settings.homeThemes': 'Thèmes (onglet Thèmes)',
  'settings.homeThemesNone': 'Aucune tuile — l’onglet Thèmes est vide.',
  'settings.homeThemesCount': '{{count}} / {{total}} thème affiché',
  'settings.readerPreview': 'Aperçu',
  'settings.readerPreviewHint': 'Chapô ou extrait, puis bouton « Afficher l’article entier ».',
  'settings.readerFull': 'Article entier',
  'settings.readerFullHint': 'Texte complet (HTML) affiché directement.',
  'settings.fontSize': 'Taille du texte',
  'settings.fontSizeReader': 'Taille du texte (lecteur)',
  'settings.fontSizeBodyPt': 'Corps à {{size}} pt',
  'settings.offlineCache': 'Articles hors ligne',
  'settings.offlineCacheHint': 'Télécharge le texte complet pour lecture sans réseau.',
  'settings.offlineLimit': '{{count}} articles',
  'settings.offlineLimitTitle': 'Nombre d’articles enregistrés',
  'settings.offlineArticles': 'Voir les articles enregistrés',
  'settings.clearCache': 'Vider le cache local',
  'settings.clearCacheTitle': 'Vider le cache local ?',
  'settings.clearCacheMessage':
    'Supprime la liste d’articles mémorisée et les téléchargements hors ligne, puis recharge les flux.',
  'settings.clearAndRefresh': 'Vider et actualiser',
  'settings.noOfflineSaved': 'Aucun article enregistré',
  'settings.noOfflineSavedHint': 'Actualisez l’accueil une fois vos flux chargés, puis réessayez.',
  'settings.commentPseudo': 'Pseudo commentaires',
  'settings.commentPseudoHint': 'Affiché sous vos messages ({{min}}–{{max}} caractères).',
  'settings.commentPseudoSave': 'Enregistrer',
  'settings.signOutTitle': 'Se déconnecter ?',
  'settings.signOutMessage': 'Vos données restent sur cet appareil.',
  'settings.signOut': 'Déconnexion',
  'settings.signOutFailed': 'Déconnexion impossible',
  'settings.deleteAccount': 'Supprimer mon compte',
  'settings.deleteAccountHint':
    'Efface votre compte Apple lié, sync cloud, tokens push et données associées (RGPD).',
  'settings.deleteAccountTitle': 'Supprimer définitivement ?',
  'settings.deleteAccountMessage':
    'Cette action est irréversible. Votre compte, abonnements synchronisés, tokens push et profil cloud seront effacés. Les commentaires anonymes déjà publiés restent visibles sans lien vers vous.',
  'settings.deleteAccountConfirm': 'Supprimer',
  'settings.deleteAccountFailed': 'Suppression impossible',
  'settings.privacy': 'Politique de confidentialité',
  'settings.privacyHint': 'Données collectées, cookies, droits RGPD',
  'settings.adminLoginRequired': 'Connectez-vous avec Apple pour accéder à l’administration.',
  'settings.adminDenied': 'Ce compte n’est pas enregistré comme administrateur.',
  'settings.adminCheckFailed': 'Impossible de vérifier les droits admin.',
  'settings.adminOpen': 'Ouvrir l’administration',
  'settings.pushPermission': 'Autorisez les notifications pour Appigeek dans Réglages iOS.',
  'settings.pushToken':
    'Impossible d’obtenir le jeton push Expo. Réessayez sur un iPhone réel (pas Simulateur).',
  'settings.pushSave':
    'Jeton obtenu mais non enregistré sur le serveur. Vérifiez la connexion, puis réessayez.',
  'settings.pushNoProject': 'Configuration push manquante dans ce build.',
  'settings.pushNotDevice': 'Les alertes push nécessitent un appareil physique.',
  'settings.pushGenericError': 'Impossible d’activer les alertes pour le moment.',
  'settings.pushTestSent': 'Test envoyé',
  'settings.pushTestSentHint':
    'Si vous ne voyez rien d’ici quelques secondes, vérifiez Réglages iOS → Notifications → Appigeek.',
  'settings.pushAlertsMenu': 'Alertes nouveaux articles',
  'settings.pushTest': 'Tester les alertes',
  'settings.pushDisable': 'Désactiver',
  'settings.pushActivated': 'Alertes activées',
  'settings.pushActivatedHint':
    'Une notification de test a été envoyée. Ensuite : alertes avec titres à 8 h et 13 h, rappel lecture à 18 h (heure de Paris).',
  'settings.pushRegisterFailed': 'Impossible d’enregistrer les alertes. Réessayez dans un instant.',
  'settings.openSettings': 'Ouvrir Réglages',
  'settings.version': 'Version',
  'settings.syncNow': 'Synchroniser maintenant',
  'settings.syncing': 'Synchronisation…',
  'toolbar.all': 'Tous',
  'toolbar.unread': 'Non lus',
  'toolbar.favorites': 'Favoris',
  'article.read': 'Lire l’article',
  'article.linkUnavailable': 'Lien indisponible',
  'article.addFavorite': 'Ajouter aux favoris',
  'article.removeFavorite': 'Retirer des favoris',
  'article.openSource': 'Ouvrir sur le site source',
  'article.showFull': 'Afficher l’article entier',
  'article.openEmbed': 'Ouvrir le contenu intégré',
  'article.openVideoBrowser': 'Ouvrir la vidéo dans le navigateur',
  'selection.exit': 'Quitter le mode sélection',
  'selection.hint': 'Sélectionnez des articles',
  'selection.markRead': 'Marquer lus',
  'featured.title': 'À la une',
  'featured.badge': 'Sélection Appigeek',
  'featured.readCta': 'Lire l’article',
  'featured.readArticleA11y': 'Lire {{title}}',
  'recommendations.title': 'Pour vous',
  'saved.title': 'Enregistrés hors ligne',
  'saved.seeAll': 'Tout voir',
  'saved.empty': 'Aucun article enregistré.',
  'comments.title': 'Commentaires',
  'comments.pseudoRequired': 'Pseudo requis',
  'comments.pseudoRequiredHint':
    'Choisissez un pseudo ({{min}}–{{max}} caractères, sans chevrons).',
  'comments.emptyComment': 'Écrivez au moins un caractère.',
  'comments.sendFailed': 'Réessayez dans un instant.',
  'comments.deleteTitle': 'Supprimer ce commentaire ?',
  'comments.deleteFailed': 'Suppression impossible',
  'comments.reportTitle': 'Signaler ce commentaire ?',
  'comments.reportMessage': 'Le signalement est anonyme et sera examiné.',
  'comments.report': 'Signaler',
  'comments.reportThanks': 'Signalement enregistré.',
  'comments.reportThanksTitle': 'Merci',
  'comments.networkError': 'Erreur réseau',
  'selection.selectedCount': '{{count}} sélectionné',
  'comments.reportFailed': 'Signalement impossible',
  'comments.longPressDelete': 'Appui long pour supprimer',
  'comments.longPressReport': 'Appui long pour signaler',
  'comments.pseudoPlaceholder': 'Votre pseudo',
  'comments.bodyPlaceholder': 'Votre commentaire…',
  'comments.send': 'Envoyer',
  'comments.publish': 'Publier',
  'comments.disclaimer':
    'Pseudo visible par tous. Pas de compte requis pour commenter — restez courtois. Appui long : supprimer vos messages ou signaler ceux des autres.',
  'comments.loading': 'Chargement des commentaires…',
  'comments.empty': 'Soyez le premier à commenter.',
  'comments.unavailable': 'Les commentaires partagés seront activés prochainement sur ce build.',
  'comments.signInHint': 'Connectez-vous pour commenter.',
  'summary.title': 'Résumé en 3 points',
  'summary.generating': 'Génération du résumé…',
  'summary.unavailable': 'Résumé indisponible pour cet article.',
  'summary.retry': 'Réessayer',
  'summary.ai': 'Résumé enrichi',
  'summary.local': 'Résumé local (extrait)',
  'reader.listen': 'Écouter',
  'reader.stopListen': 'Arrêter la lecture',
  'reader.openSafari': 'Ouvrir dans Safari',
  'reader.copyLink': 'Copier le lien',
  'reader.openBrowser': 'Ouvrir dans le navigateur in-app',
  'reader.share': 'Partager…',
  'reader.proposeFeatured': 'Proposer à la une',
  'reader.more': 'Plus d’options',
  'reader.jumpToDiscussion': 'Aller à la discussion',
  'reader.addFavorite': 'Ajouter aux favoris',
  'reader.removeFavorite': 'Retirer des favoris',
  'reader.hintUseMenu': 'Ouvrez le menu ••• en haut à droite pour plus d’options.',
  'reader.fetchingFull': 'Récupération du texte complet sur le site…',
  'reader.preparing': 'Préparation de l’article pour la lecture…',
  'reader.excerptOnly':
    'Le flux ne contient qu’un extrait — lecture complète chargée ou en attente',
  'reader.analyzingPage': 'Analyse de la page pour extraire l’article…',
  'reader.formatting': 'Mise en forme du texte…',
  'reader.previewUnavailable': 'Aperçu indisponible — ouvrez l’article entier.',
  'home.swipeTip': 'Glissez un article vers la gauche pour le marquer comme lu.',
  'home.swipeTipDismiss': 'Compris',
  'home.pickArticle': 'Choisissez un article dans la liste',
  'feeds.loadError': 'Impossible de charger vos données locales.',
  'themePicker.intro':
    'Les thèmes filtrent l’accueil par mots-clés dans les titres. Désactivez ceux que vous ne souhaitez pas voir.',
  'themePicker.enableAll': 'Tout activer',
  'themePicker.disableAll': 'Tout désactiver',
  'themePicker.counter': '{{count}} thème actif sur {{total}}',
  'themePicker.warnNone': 'Aucun thème actif : l’onglet Thèmes sera vide.',
  'themePicker.customSection': 'Thème personnalisé',
  'themePicker.customHint': 'Un mot ou une expression présente dans les titres d’articles.',
  'themePicker.addTheme': 'Ajouter ce thème',
  'themePicker.myThemes': 'Mes thèmes ({{count}})',
  'themePicker.builtinSection': 'Thèmes intégrés',
  'themePicker.duplicateName': 'Ce nom existe déjà.',
  'themePicker.nameRequired': 'Entrez un nom de thème.',
  'themePicker.nameTooLong': 'Le nom est trop long ({{max}} caractères max).',
  'themePicker.maxThemes': 'Nombre maximum de thèmes personnalisés atteint.',
  'themePicker.removeTitle': 'Supprimer ce thème',
  'themePicker.removeMessage':
    '« {{label}} » sera retiré. Les articles restent dans le fil général.',
  'themePicker.removeConfirm': 'Supprimer',
  'themePicker.removeA11y': 'Supprimer le thème',
  'themePicker.customPlaceholder': 'Ex. Steam Deck, Rust, Framework Laptop…',
  'themePicker.customMatchHint': 'Correspondance par mots du titre.',
  'themePicker.builtinMatchHint': 'Classés par mots-clés dans le titre des articles.',
  'toolbar.allSources': 'Toutes les sources',
  'toolbar.markAllRead': 'Tout lu',
  'article.markReadShort': 'Lu',
  'selection.select': 'Sélectionner',
  'selection.deselect': 'Désélectionner',
  'visualTheme.dark_default': 'Minuit (par défaut)',
  'visualTheme.light': 'Jour',
  'visualTheme.ocean': 'Océan',
  'visualTheme.sunset': 'Sunset',
  'visualTheme.forest': 'Forêt',
  'settings.fontSmall': 'Petite',
  'settings.fontMedium': 'Normale',
  'settings.fontLarge': 'Grande',
  'settings.offlineCacheHintOn': 'Télécharge le texte complet pour lecture sans réseau.',
  'settings.offlineCacheHintOff': 'Désactivé — aucun nouvel article ne sera enregistré localement.',
  'settings.section.comments': 'Commentaires',
  'settings.section.danger': 'Zone sensible',
  'settings.adminUnlockedHint': 'Accès mémorisé sur cet appareil — un appui ouvre l’espace admin.',
  'settings.offlineArticlesListHint': 'Articles déjà téléchargés sur cet appareil.',
  'settings.offlineLimitDefault': ' (défaut)',
  'settings.signInFailed': 'Connexion impossible',
  'common.close': 'Fermer',
  'nav.themeDefault': 'Thème',
  'nav.themePicker': 'Choisir les thèmes',
  'nav.offlineArticles': 'Articles hors ligne',
  'nav.admin': 'Administration',
  'quickAction.homeTitle': 'Accueil',
  'quickAction.homeSubtitle': 'Fil d’actualité',
  'quickAction.discussionsTitle': 'Discussions',
  'quickAction.discussionsSubtitle': 'Commentaires',
  'quickAction.feedsTitle': 'Abonnements',
  'quickAction.feedsSubtitle': 'Gérer les flux',
  'ad.label': 'Publicité',
  'ad.hide': 'Masquer',
  'ad.hideA11y': 'Masquer cette annonce',
  'ad.fallbackA11y': 'Publicité : {{title}}',
  'ad.fallbackTitle': 'Soutenir l’application',
  'reader.missingArticle':
    'Article introuvable dans la liste (actualisez le fil). Ouvrez la page source ci-dessous.',
  'reader.openExternalBrowser': 'Ouvrir dans le navigateur',
  'reader.sourceOfflineSaved': 'Article enregistré hors ligne — disponible sans réseau.',
  'reader.sourceFromPagePreview':
    'Texte complet récupéré depuis le site — affichez-le ci-dessous.',
  'reader.sourceFromRssPreview':
    'Article complet fourni par le flux RSS — affichez-le ci-dessous.',
  'reader.showFullArticle': 'Afficher l’article entier',
  'reader.backToPreview': 'Revenir à l’aperçu',
  'reader.sourceOfflineReading': 'Lecture hors ligne — texte enregistré sur cet appareil',
  'reader.sourceFromPageFull': 'Texte récupéré depuis la page web (article complet)',
  'reader.sourceFromRssFull': 'Article complet fourni par le flux RSS',
  'reader.extractFailed':
    'Le texte complet n’a pas pu être extrait — ouvrez la page source pour lire l’article.',
  'reader.openArticlePage': 'Ouvrir la page de l’article',
  'reader.showPageInApp': 'Afficher la page dans l’app',
  'comments.countNone': 'Aucun commentaire',
  'comments.countOne': '1 commentaire',
  'comments.countMany': '{{count}} commentaires',
  'discussions.viewComments': 'Voir les commentaires',
  'discussions.loading': 'Chargement…',
  'themeArticles.unknown': 'Thème inconnu ou supprimé.',
  'themeArticles.emptyFavorites': 'Aucun favori dans ce thème.',
  'themeArticles.emptyUnread': 'Tous les articles de ce thème sont lus.',
  'themeArticles.emptyDefault':
    'Aucun article ne correspond à ce thème pour l’instant (classement par titre).',
  'offline.emptyHint':
    'Aucun article enregistré pour l’instant. Vérifiez que l’option est activée dans les paramètres, puis tirez pour actualiser l’accueil et attendez la fin de l’enregistrement (indicateur dans les paramètres).',
  'saved.moreCount': '+{{count}} de plus',
  'subscriptions.importEmpty': 'Fichier OPML illisible ou vide.',
  'subscriptions.importDone': 'Import terminé',
  'subscriptions.importAllPresent': 'Tous les flux du fichier étaient déjà présents.',
  'subscriptions.importFailedTitle': 'Import impossible',
  'subscriptions.importFailedMessage': 'Fichier OPML illisible ou vide.',
  'subscriptions.feedTitlePlaceholder': 'Nom affiché dans l’app',
  'subscriptions.feedUrlPlaceholder': 'https://exemple.com/feed.xml',
  'subscriptions.opmlSection': 'Fichier OPML',
  'subscriptions.catalogSearch': 'Rechercher une source…',
  'subscriptions.removeA11y': 'Retirer {{title}}',
  'subscriptions.addA11y': 'Ajouter {{title}}',
  'subscriptions.alreadyAddedA11y': '{{title}} déjà ajouté',
  'reader.linkUnsupported': 'Lien non pris en charge',
  'reader.linkOpenFailed': 'Impossible d’ouvrir le lien',
  'reader.noArticleUrl': 'Aucune URL d’article.',
  'reader.featuredProposedTitle': 'Proposition envoyée',
  'reader.featuredProposedMessage': 'Un admin la validera avant qu’elle n’apparaisse à la une.',
  'reader.featuredProposeFailed': 'Envoi impossible',
  'reader.featuredProposeNeedSignIn': 'Connectez-vous avec Apple pour proposer un article à la une.',
  'reader.featuredProposeSignIn': 'Se connecter',
  'reader.appleSignInUnavailable': 'Non disponible sur cet appareil.',
  'reader.signInFailed': 'Connexion Apple impossible',
  'reader.toggleWebUnderExcerptHide': 'Masquer la page sous l’extrait',
  'reader.toggleWebUnderExcerptShow': 'Afficher la page sous l’extrait',
  'reader.sendFailed': 'Envoi impossible',
};

// Fix type issue - home.unreadCountPlural was added but not in TranslationKey
// I'll remove it and handle plural in code

const en: Dictionary = {
  'brand.tagline': 'Your geek news, one feed at a time',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.ok': 'OK',
  'common.remove': 'Remove',
  'common.error': 'Error',
  'common.retry': 'Retry',
  'common.refresh': 'Refresh',
  'common.loading': 'Loading…',
  'common.add': 'Add',
  'tabs.home': 'Home',
  'tabs.themes': 'Topics',
  'tabs.discussions': 'Discussions',
  'tabs.discover': 'Discover',
  'tabs.subscriptions': 'Subscriptions',
  'tabs.settings': 'Settings',
  'themes.subtitle': 'Browse your articles by topic.',
  'home.updatedAt': 'Updated',
  'home.offlineSyncing': 'downloading full articles…',
  'home.byTheme': 'By topic',
  'home.hide': 'Hide',
  'home.showExtras': 'Offline & suggestions',
  'home.hideExtras': 'Hide offline & suggestions',
  'home.noThemesSelected': 'No topics selected. Choose which ones to show in the Topics tab.',
  'home.chooseThemes': 'Choose topics',
  'home.themeHintEmpty':
    'Articles will be grouped here by title keywords (built-in or custom topics). Add feeds to fill your home screen.',
  'home.feed': 'News feed',
  'home.unreadCount': 'unread',
  'home.searchInFeed': 'Search in {{feed}}…',
  'home.searchArticles': 'Search articles…',
  'home.markAllReadTitle': 'Mark all as read',
  'home.markAllReadMessage': '{{count}} articles in this list?',
  'home.loadingArticles': 'Loading articles…',
  'home.refreshing': 'Refreshing…',
  'home.emptyNoFeeds': 'Add your first feed in Subscriptions.',
  'home.emptyNoFavorites': 'No favorites yet.',
  'home.emptyAllRead': 'All articles are read.',
  'home.emptyFeedSearch': 'No articles for {{feed}}{{search}}.',
  'home.emptySearch': 'No results for this search.',
  'home.emptyDefault': 'No articles right now.',
  'discover.title': 'Discover',
  'discover.subtitle': 'Add feeds by geek topic — tech, games, science, pop culture.',
  'subscriptions.title': 'Subscriptions',
  'subscriptions.subtitle': 'Discover sources, manage RSS feeds, and import or export an OPML list.',
  'subscriptions.addFeed': 'Add a feed',
  'subscriptions.feedTitle': 'Title (optional)',
  'subscriptions.feedUrl': 'RSS feed URL',
  'subscriptions.add': 'Add',
  'subscriptions.yourFeeds': 'Your feeds ({{count}})',
  'subscriptions.empty': 'No subscriptions yet.',
  'subscriptions.importOpml': 'Import OPML',
  'subscriptions.exportOpml': 'Export OPML',
  'subscriptions.resetDefaults': 'Reset default feeds',
  'subscriptions.resetConfirmTitle': 'Reset subscriptions?',
  'subscriptions.resetConfirmMessage':
    'Replaces your subscriptions with recommended feeds for your language. Read and favorite states will be cleared.',
  'subscriptions.invalidUrlTitle': 'Invalid URL',
  'subscriptions.invalidUrlMessage': 'Paste a valid RSS or Atom feed URL (https://…).',
  'subscriptions.removeFeedTitle': 'Remove this feed?',
  'subscriptions.exportUnavailable': 'Sharing is not available on this device.',
  'subscriptions.exportFailed': 'Try again in a moment.',
  'subscriptions.importFailed': 'Unreadable or empty OPML file.',
  'subscriptions.importSuccess': '{{count}} feed(s) imported.',
  'subscriptions.defaultFeedName': 'RSS feed',
  'discussions.title': 'Discussions',
  'discussions.subtitle': 'Articles discussed by the Appigeek community — open to read and reply.',
  'discussions.unavailable': 'Discussions will be available soon.',
  'discussions.retryHint': 'Tap to retry.',
  'discussions.empty': 'No discussions yet. Comment on an article to start a thread.',
  'discussions.articleFallback': 'Article',
  'settings.title': 'Settings',
  'settings.subtitle':
    'Default behavior when opening an article (you can always switch in the reader).',
  'settings.section.account': 'Account',
  'settings.section.appearance': 'Appearance',
  'settings.chooseTheme': 'Choose a theme',
  'settings.chooseFontSize': 'Text size',
  'settings.section.home': 'Home',
  'settings.section.reading': 'Reading',
  'settings.section.offline': 'Offline',
  'settings.section.language': 'Language',
  'settings.section.about': 'About',
  'settings.languageHint': 'UI language and recommended feed catalog.',
  'settings.localeChangeTitle': 'Change language',
  'settings.localeChangeMessage':
    'Your subscriptions will be replaced with recommended feeds for {{lang}}. Cached articles, read state and favorites will be cleared.',
  'settings.localeChangeConfirm': 'Change language',
  'settings.addRecommendedFeeds': 'Add feeds',
  'settings.loginRequired': 'Sign in required',
  'settings.appleSignIn': 'Sign in with Apple',
  'settings.appleSignedIn': 'Signed in with Apple',
  'settings.appleHintSignIn': 'Sync subscriptions and read state across iPhones.',
  'settings.appleHintSignedIn':
    'Subscriptions, read state, favorites and nickname synced. Tap to sign out.',
  'settings.appleAccount': 'Apple account',
  'settings.appleUnavailable': 'Cloud account unavailable in this build.',
  'settings.pushAlerts': 'New article alerts',
  'settings.pushEnabled':
    'On — 8 AM / 1 PM / 6 PM (article headlines, Paris time). Tap to test or disable.',
  'settings.pushDisabled':
    '8 AM, 1 PM & 6 PM: notification with an article title (Paris time).',
  'settings.pushNeedSignIn': 'Sign in with Apple to enable alerts.',
  'settings.homeThemes': 'Topics (Topics tab)',
  'settings.homeThemesNone': 'No tiles — the Topics tab is empty.',
  'settings.homeThemesCount': '{{count}} / {{total}} topics shown',
  'settings.readerPreview': 'Preview',
  'settings.readerPreviewHint': 'Lead or excerpt, then “Show full article” button.',
  'settings.readerFull': 'Full article',
  'settings.readerFullHint': 'Full HTML text shown directly.',
  'settings.fontSize': 'Text size',
  'settings.fontSizeReader': 'Reader text size',
  'settings.fontSizeBodyPt': 'Body at {{size}} pt',
  'settings.offlineCache': 'Offline articles',
  'settings.offlineCacheHint': 'Downloads full text for reading without a network.',
  'settings.offlineLimit': '{{count}} articles',
  'settings.offlineLimitTitle': 'Number of saved articles',
  'settings.offlineArticles': 'View saved articles',
  'settings.clearCache': 'Clear local cache',
  'settings.clearCacheTitle': 'Clear local cache?',
  'settings.clearCacheMessage':
    'Removes cached article list and offline downloads, then reloads feeds.',
  'settings.clearAndRefresh': 'Clear and refresh',
  'settings.noOfflineSaved': 'No articles saved',
  'settings.noOfflineSavedHint': 'Refresh Home once feeds are loaded, then try again.',
  'settings.commentPseudo': 'Comment nickname',
  'settings.commentPseudoHint': 'Shown under your messages ({{min}}–{{max}} characters).',
  'settings.commentPseudoSave': 'Save',
  'settings.signOutTitle': 'Sign out?',
  'settings.signOutMessage': 'Your data stays on this device.',
  'settings.signOut': 'Sign out',
  'settings.signOutFailed': 'Could not sign out',
  'settings.deleteAccount': 'Delete my account',
  'settings.deleteAccountHint':
    'Erases your linked Apple account, cloud sync, push tokens and related data (GDPR).',
  'settings.deleteAccountTitle': 'Delete permanently?',
  'settings.deleteAccountMessage':
    'This cannot be undone. Your account, synced subscriptions, push tokens and cloud profile will be erased. Anonymous comments already posted stay visible with no link to you.',
  'settings.deleteAccountConfirm': 'Delete',
  'settings.deleteAccountFailed': 'Could not delete account',
  'settings.privacy': 'Privacy policy',
  'settings.privacyHint': 'Data we collect, cookies, GDPR rights',
  'settings.adminLoginRequired': 'Sign in with Apple to access administration.',
  'settings.adminDenied': 'This account is not registered as an administrator.',
  'settings.adminCheckFailed': 'Could not verify admin rights.',
  'settings.adminOpen': 'Open administration',
  'settings.pushPermission': 'Allow notifications for Appigeek in iOS Settings.',
  'settings.pushToken': 'Could not get Expo push token. Try on a real iPhone (not Simulator).',
  'settings.pushSave': 'Token obtained but not saved on server. Check connection and retry.',
  'settings.pushNoProject': 'Push configuration missing in this build.',
  'settings.pushNotDevice': 'Push alerts require a physical device.',
  'settings.pushGenericError': 'Could not enable alerts right now.',
  'settings.pushTestSent': 'Test sent',
  'settings.pushTestSentHint':
    'If nothing appears within a few seconds, check iOS Settings → Notifications → Appigeek.',
  'settings.pushAlertsMenu': 'New article alerts',
  'settings.pushTest': 'Test alerts',
  'settings.pushDisable': 'Disable',
  'settings.pushActivated': 'Alerts enabled',
  'settings.pushActivatedHint':
    'A test notification was sent. Then: headline alerts at 8 AM & 1 PM, reading reminder at 6 PM (Paris time).',
  'settings.pushRegisterFailed': 'Could not register alerts. Try again shortly.',
  'settings.openSettings': 'Open Settings',
  'settings.version': 'Version',
  'settings.syncNow': 'Sync now',
  'settings.syncing': 'Syncing…',
  'toolbar.all': 'All',
  'toolbar.unread': 'Unread',
  'toolbar.favorites': 'Favorites',
  'article.read': 'Read article',
  'article.linkUnavailable': 'Link unavailable',
  'article.addFavorite': 'Add to favorites',
  'article.removeFavorite': 'Remove from favorites',
  'article.openSource': 'Open on source site',
  'article.showFull': 'Show full article',
  'article.openEmbed': 'Open embedded content',
  'article.openVideoBrowser': 'Open video in browser',
  'selection.exit': 'Exit selection mode',
  'selection.hint': 'Select articles',
  'selection.markRead': 'Mark read',
  'featured.title': 'Featured',
  'featured.badge': 'Appigeek pick',
  'featured.readCta': 'Read article',
  'featured.readArticleA11y': 'Read {{title}}',
  'recommendations.title': 'For you',
  'saved.title': 'Saved offline',
  'saved.seeAll': 'See all',
  'saved.empty': 'No saved articles.',
  'comments.title': 'Comments',
  'comments.pseudoRequired': 'Nickname required',
  'comments.pseudoRequiredHint': 'Choose a nickname ({{min}}–{{max}} characters, no angle brackets).',
  'comments.emptyComment': 'Write at least one character.',
  'comments.sendFailed': 'Try again in a moment.',
  'comments.deleteTitle': 'Delete this comment?',
  'comments.deleteFailed': 'Could not delete',
  'comments.reportTitle': 'Report this comment?',
  'comments.reportMessage': 'Reports are anonymous and will be reviewed.',
  'comments.report': 'Report',
  'comments.reportThanks': 'Report submitted.',
  'comments.reportThanksTitle': 'Thanks',
  'comments.networkError': 'Network error',
  'selection.selectedCount': '{{count}} selected',
  'comments.reportFailed': 'Could not report',
  'comments.longPressDelete': 'Long press to delete',
  'comments.longPressReport': 'Long press to report',
  'comments.pseudoPlaceholder': 'Your nickname',
  'comments.bodyPlaceholder': 'Your comment…',
  'comments.send': 'Send',
  'comments.publish': 'Post',
  'comments.disclaimer':
    'Nickname visible to everyone. No account required — be courteous. Long press to delete your messages or report others.',
  'comments.loading': 'Loading comments…',
  'comments.empty': 'Be the first to comment.',
  'comments.unavailable': 'Shared comments will be enabled soon on this build.',
  'comments.signInHint': 'Sign in to comment.',
  'summary.title': '3-point summary',
  'summary.generating': 'Generating summary…',
  'summary.unavailable': 'Summary unavailable for this article.',
  'summary.retry': 'Try again',
  'summary.ai': 'Enhanced summary',
  'summary.local': 'Local summary (excerpt)',
  'reader.listen': 'Listen',
  'reader.stopListen': 'Stop listening',
  'reader.openSafari': 'Open in Safari',
  'reader.copyLink': 'Copy link',
  'reader.openBrowser': 'Open in-app browser',
  'reader.share': 'Share…',
  'reader.proposeFeatured': 'Suggest for featured',
  'reader.more': 'More options',
  'reader.jumpToDiscussion': 'Jump to discussion',
  'reader.addFavorite': 'Add to favorites',
  'reader.removeFavorite': 'Remove from favorites',
  'reader.hintUseMenu': 'Open the ••• menu in the top right for more options.',
  'reader.fetchingFull': 'Fetching the full article from the site…',
  'reader.preparing': 'Preparing the article for reading…',
  'reader.excerptOnly': 'The feed only has an excerpt — full article loading or pending',
  'reader.analyzingPage': 'Analyzing the page to extract the article…',
  'reader.formatting': 'Formatting the text…',
  'reader.previewUnavailable': 'Preview unavailable — open the full article.',
  'home.swipeTip': 'Swipe an article left to mark it as read.',
  'home.swipeTipDismiss': 'Got it',
  'home.pickArticle': 'Pick an article from the list',
  'feeds.loadError': 'Could not load your local data.',
  'themePicker.intro':
    'Topics filter Home by keywords in titles. Disable those you do not want to see.',
  'themePicker.enableAll': 'Enable all',
  'themePicker.disableAll': 'Disable all',
  'themePicker.counter': '{{count}} active topics of {{total}}',
  'themePicker.warnNone': 'No active topics: the Topics tab will be empty.',
  'themePicker.customSection': 'Custom topic',
  'themePicker.customHint': 'A word or phrase found in article titles.',
  'themePicker.addTheme': 'Add this topic',
  'themePicker.myThemes': 'My topics ({{count}})',
  'themePicker.builtinSection': 'Built-in topics',
  'themePicker.duplicateName': 'This name already exists.',
  'themePicker.nameRequired': 'Enter a topic name.',
  'themePicker.nameTooLong': 'Name is too long ({{max}} characters max).',
  'themePicker.maxThemes': 'Maximum number of custom topics reached.',
  'themePicker.removeTitle': 'Remove this topic',
  'themePicker.removeMessage': '“{{label}}” will be removed. Articles stay in the main feed.',
  'themePicker.removeConfirm': 'Remove',
  'themePicker.removeA11y': 'Remove topic',
  'themePicker.customPlaceholder': 'e.g. Steam Deck, Rust, Framework Laptop…',
  'themePicker.customMatchHint': 'Matched by words in the title.',
  'themePicker.builtinMatchHint': 'Grouped by keywords in article titles.',
  'toolbar.allSources': 'All sources',
  'toolbar.markAllRead': 'Mark all read',
  'article.markReadShort': 'Read',
  'selection.select': 'Select',
  'selection.deselect': 'Deselect',
  'visualTheme.dark_default': 'Midnight (default)',
  'visualTheme.light': 'Day',
  'visualTheme.ocean': 'Ocean',
  'visualTheme.sunset': 'Sunset',
  'visualTheme.forest': 'Forest',
  'settings.fontSmall': 'Small',
  'settings.fontMedium': 'Medium',
  'settings.fontLarge': 'Large',
  'settings.offlineCacheHintOn': 'Downloads full text for reading without a network.',
  'settings.offlineCacheHintOff': 'Off — no new articles will be saved locally.',
  'settings.section.comments': 'Comments',
  'settings.section.danger': 'Danger zone',
  'settings.adminUnlockedHint': 'Shortcut saved on this device — tap to open admin.',
  'settings.offlineArticlesListHint': 'Articles already downloaded on this device.',
  'settings.offlineLimitDefault': ' (default)',
  'settings.signInFailed': 'Could not sign in',
  'common.close': 'Close',
  'nav.themeDefault': 'Topic',
  'nav.themePicker': 'Choose topics',
  'nav.offlineArticles': 'Offline articles',
  'nav.admin': 'Administration',
  'quickAction.homeTitle': 'Home',
  'quickAction.homeSubtitle': 'News feed',
  'quickAction.discussionsTitle': 'Discussions',
  'quickAction.discussionsSubtitle': 'Comments',
  'quickAction.feedsTitle': 'Subscriptions',
  'quickAction.feedsSubtitle': 'Manage feeds',
  'ad.label': 'Ad',
  'ad.hide': 'Hide',
  'ad.hideA11y': 'Hide this ad',
  'ad.fallbackA11y': 'Ad: {{title}}',
  'ad.fallbackTitle': 'Support the app',
  'reader.missingArticle':
    'Article not found in the list (refresh the feed). Open the source page below.',
  'reader.openExternalBrowser': 'Open in browser',
  'reader.sourceOfflineSaved': 'Article saved offline — available without a network.',
  'reader.sourceFromPagePreview': 'Full text fetched from the site — show it below.',
  'reader.sourceFromRssPreview': 'Full article provided by the RSS feed — show it below.',
  'reader.showFullArticle': 'Show full article',
  'reader.backToPreview': 'Back to preview',
  'reader.sourceOfflineReading': 'Offline reading — text saved on this device',
  'reader.sourceFromPageFull': 'Text fetched from the web page (full article)',
  'reader.sourceFromRssFull': 'Full article provided by the RSS feed',
  'reader.extractFailed':
    'Could not extract the full text — open the source page to read the article.',
  'reader.openArticlePage': 'Open article page',
  'reader.showPageInApp': 'Show page in the app',
  'comments.countNone': 'No comments',
  'comments.countOne': '1 comment',
  'comments.countMany': '{{count}} comments',
  'discussions.viewComments': 'View comments',
  'discussions.loading': 'Loading…',
  'themeArticles.unknown': 'Unknown or removed topic.',
  'themeArticles.emptyFavorites': 'No favorites in this topic.',
  'themeArticles.emptyUnread': 'All articles in this topic are read.',
  'themeArticles.emptyDefault':
    'No articles match this topic yet (grouped by title keywords).',
  'offline.emptyHint':
    'No saved articles yet. Enable the option in Settings, pull to refresh Home, and wait for downloads to finish (see Settings).',
  'saved.moreCount': '+{{count}} more',
  'subscriptions.importEmpty': 'Unreadable or empty OPML file.',
  'subscriptions.importDone': 'Import complete',
  'subscriptions.importAllPresent': 'All feeds in the file were already added.',
  'subscriptions.importFailedTitle': 'Import failed',
  'subscriptions.importFailedMessage': 'Unreadable or empty OPML file.',
  'subscriptions.feedTitlePlaceholder': 'Name shown in the app',
  'subscriptions.feedUrlPlaceholder': 'https://example.com/feed.xml',
  'subscriptions.opmlSection': 'OPML file',
  'subscriptions.catalogSearch': 'Search a source…',
  'subscriptions.removeA11y': 'Remove {{title}}',
  'subscriptions.addA11y': 'Add {{title}}',
  'subscriptions.alreadyAddedA11y': '{{title}} already added',
  'reader.linkUnsupported': 'Link not supported',
  'reader.linkOpenFailed': 'Could not open link',
  'reader.noArticleUrl': 'No article URL.',
  'reader.featuredProposedTitle': 'Suggestion sent',
  'reader.featuredProposedMessage': 'An admin will review it before it appears in Featured.',
  'reader.featuredProposeFailed': 'Could not send',
  'reader.featuredProposeNeedSignIn': 'Sign in with Apple to suggest an article for Featured.',
  'reader.featuredProposeSignIn': 'Sign in',
  'reader.appleSignInUnavailable': 'Not available on this device.',
  'reader.signInFailed': 'Apple sign-in failed',
  'reader.toggleWebUnderExcerptHide': 'Hide page below excerpt',
  'reader.toggleWebUnderExcerptShow': 'Show page below excerpt',
  'reader.sendFailed': 'Could not send',
};

// Spanish, Italian, Portuguese - abbreviated creation using similar structure
// I'll create es, it, pt dictionaries

const es: Dictionary = {
  ...en,
  'brand.tagline': 'Tu actualidad geek, un feed a la vez',
  'tabs.home': 'Inicio',
  'tabs.themes': 'Temas',
  'themes.subtitle': 'Explora tus artículos por tema.',
  'tabs.discover': 'Descubrir',
  'tabs.subscriptions': 'Suscripciones',
  'tabs.settings': 'Ajustes',
  'common.cancel': 'Cancelar',
  'common.confirm': 'Confirmar',
  'common.remove': 'Quitar',
  'common.error': 'Error',
  'common.loading': 'Cargando…',
  'common.add': 'Añadir',
  'discover.title': 'Descubrir',
  'discover.subtitle': 'Añade feeds por tema geek — tech, juegos, ciencia, cultura pop.',
  'subscriptions.title': 'Suscripciones',
  'settings.title': 'Ajustes',
  'settings.section.language': 'Idioma',
  'settings.languageHint': 'Idioma de la interfaz y catálogo de feeds recomendados.',
  'settings.localeChangeTitle': 'Cambiar idioma',
  'settings.localeChangeMessage':
    '¿Sustituir tus suscripciones por los feeds recomendados para {{lang}}? Se borrarán artículos en caché, leídos y favoritos.',
  'settings.localeChangeConfirm': 'Cambiar idioma',
  'home.feed': 'Actualidad',
  'home.byTheme': 'Por tema',
  'home.chooseThemes': 'Elegir temas',
  'home.searchArticles': 'Buscar un artículo…',
  'toolbar.all': 'Todos',
  'toolbar.unread': 'No leídos',
  'toolbar.favorites': 'Favoritos',
  'article.read': 'Leer artículo',
  'comments.title': 'Comentarios',
  'recommendations.title': 'Para ti',
  'featured.title': 'Destacados',
  'feeds.loadError': 'No se pudieron cargar los datos locales.',
};

const it: Dictionary = {
  ...en,
  'brand.tagline': 'La tua rassegna geek, un feed alla volta',
  'tabs.home': 'Home',
  'tabs.themes': 'Temi',
  'themes.subtitle': 'Sfoglia i tuoi articoli per tema.',
  'tabs.discover': 'Scopri',
  'tabs.subscriptions': 'Abbonamenti',
  'tabs.settings': 'Impostazioni',
  'common.cancel': 'Annulla',
  'common.confirm': 'Conferma',
  'common.remove': 'Rimuovi',
  'common.error': 'Errore',
  'common.loading': 'Caricamento…',
  'common.add': 'Aggiungi',
  'discover.title': 'Scopri',
  'discover.subtitle': 'Aggiungi feed per tema geek — tech, giochi, scienza, pop culture.',
  'subscriptions.title': 'Abbonamenti',
  'settings.title': 'Impostazioni',
  'settings.section.language': 'Lingua',
  'settings.languageHint': 'Lingua dell’interfaccia e catalogo feed consigliati.',
  'settings.localeChangeTitle': 'Cambia lingua',
  'settings.localeChangeMessage':
    'Sostituire i tuoi abbonamenti con i feed consigliati per {{lang}}? Articoli in cache, letti e preferiti verranno cancellati.',
  'settings.localeChangeConfirm': 'Cambia lingua',
  'home.feed': 'Notizie',
  'home.byTheme': 'Per tema',
  'home.chooseThemes': 'Scegli temi',
  'home.searchArticles': 'Cerca un articolo…',
  'toolbar.all': 'Tutti',
  'toolbar.unread': 'Non letti',
  'toolbar.favorites': 'Preferiti',
  'article.read': 'Leggi articolo',
  'comments.title': 'Commenti',
  'recommendations.title': 'Per te',
  'featured.title': 'In evidenza',
  'feeds.loadError': 'Impossibile caricare i dati locali.',
};

const pt: Dictionary = {
  ...en,
  'brand.tagline': 'A sua veille geek, um feed de cada vez',
  'tabs.home': 'Início',
  'tabs.themes': 'Temas',
  'themes.subtitle': 'Explore os seus artigos por tema.',
  'tabs.discover': 'Descobrir',
  'tabs.subscriptions': 'Subscrições',
  'tabs.settings': 'Definições',
  'common.cancel': 'Cancelar',
  'common.confirm': 'Confirmar',
  'common.remove': 'Remover',
  'common.error': 'Erro',
  'common.loading': 'A carregar…',
  'common.add': 'Adicionar',
  'discover.title': 'Descobrir',
  'discover.subtitle': 'Adicione feeds por tema geek — tech, jogos, ciência, cultura pop.',
  'subscriptions.title': 'Subscrições',
  'settings.title': 'Definições',
  'settings.section.language': 'Idioma',
  'settings.languageHint': 'Idioma da interface e catálogo de feeds recomendados.',
  'settings.localeChangeTitle': 'Mudar idioma',
  'settings.localeChangeMessage':
    'Substituir as suas subscrições pelos feeds recomendados para {{lang}}? Artigos em cache, lidos e favoritos serão apagados.',
  'settings.localeChangeConfirm': 'Mudar idioma',
  'home.feed': 'Atualidade',
  'home.byTheme': 'Por tema',
  'home.chooseThemes': 'Escolher temas',
  'home.searchArticles': 'Pesquisar um artigo…',
  'toolbar.all': 'Todos',
  'toolbar.unread': 'Não lidos',
  'toolbar.favorites': 'Favoritos',
  'article.read': 'Ler artigo',
  'comments.title': 'Comentários',
  'recommendations.title': 'Para si',
  'featured.title': 'Destaques',
  'feeds.loadError': 'Não foi possível carregar os dados locais.',
};

const MESSAGES: Record<AppLocale, Dictionary> = { fr, en, es, it, pt };

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = params[key];
    return v !== undefined ? String(v) : `{{${key}}}`;
  });
}

export function translate(
  locale: AppLocale,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  const dict = MESSAGES[locale] ?? MESSAGES.fr;
  const fallback = MESSAGES.fr[key];
  const text = dict[key] ?? fallback ?? key;
  return interpolate(text, params);
}

export function localeDateTimeLocale(locale: AppLocale): string {
  const map: Record<AppLocale, string> = {
    fr: 'fr-FR',
    en: 'en-US',
    es: 'es-ES',
    it: 'it-IT',
    pt: 'pt-PT',
  };
  return map[locale] ?? 'fr-FR';
}
