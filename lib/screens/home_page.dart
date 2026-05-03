import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:math' as math;

/// ---------------------------------------------------------------------------
/// MAISON — Home Page
/// ---------------------------------------------------------------------------
/// Ecran principal de l'app de fidelite "MAISON".
/// Design : luxe sombre, or champagne, glassmorphism premium, animations
/// fluides, typographie fine — continuite parfaite du login_screen.
///
/// Points d'integration Firebase :
///   - [FIREBASE] _userFirstName        → Firestore user doc
///   - [FIREBASE] _currentPoints        → Firestore user doc
///   - [FIREBASE] _nextRewardThreshold  → Firestore rewards config
///   - [FIREBASE] _nextRewardLabel      → Firestore rewards config
///   - [FIREBASE] _rewards              → Firestore rewards collection
///   - [FIREBASE] _promotions           → Firestore promotions collection
///   - [FIREBASE] _unreadNotifications  → Firestore notifications count
///   - [FIREBASE] onNotificationsTap()  → Navigate to notifications
///   - [FIREBASE] onRewardTap()         → Navigate to reward detail
///   - [FIREBASE] onPromotionTap()      → Navigate to promotion detail
///   - [FIREBASE] onNavTap()            → Handle bottom navigation
/// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Design tokens — identiques au login_screen.dart (MAISON design system)
// A externaliser dans lib/theme/ pour le design system global
// ---------------------------------------------------------------------------

class _MaisonTokens {
  _MaisonTokens._();

  // Couleurs principales
  static const Color charcoal = Color(0xFF1A1A1A);
  static const Color charcoalLight = Color(0xFF2A2A2A);
  static const Color charcoalMid = Color(0xFF232323);
  static const Color surface = Color(0xFF1E1E1E);
  static const Color goldChampagne = Color(0xFFD4AF37);
  static const Color goldLight = Color(0xFFE8D48B);
  static const Color goldSubtle = Color(0x33D4AF37);
  static const Color offWhite = Color(0xFFF5F0E8);
  static const Color offWhiteSecondary = Color(0xFFB0A89A);
  static const Color divider = Color(0xFF3A3A3A);
  static const Color error = Color(0xFFCF6679);
  static const Color inputFill = Color(0xFF252525);
  static const Color inputBorder = Color(0xFF3D3D3D);

  // Couleurs additionnelles pour la HomePage
  static const Color cardGlass = Color(0xFF242424);
  static const Color cardGlassBorder = Color(0xFF383838);
  static const Color progressBg = Color(0xFF2E2E2E);
  static const Color locked = Color(0xFF555555);
  static const Color success = Color(0xFF6FCF97);
  static const Color scannerGlow = Color(0xFFD4AF37);

  // Rayons
  static const double radiusSm = 8.0;
  static const double radiusMd = 12.0;
  static const double radiusLg = 16.0;
  static const double radiusXl = 20.0;
  static const double radiusXxl = 28.0;

  // Espacements
  static const double spacingXs = 4.0;
  static const double spacingS = 8.0;
  static const double spacingM = 16.0;
  static const double spacingL = 24.0;
  static const double spacingXl = 32.0;
  static const double spacingXxl = 48.0;

  // Durees d'animation
  static const Duration animFast = Duration(milliseconds: 300);
  static const Duration animMedium = Duration(milliseconds: 500);
  static const Duration animSlow = Duration(milliseconds: 800);
  static const Duration animVerySlow = Duration(milliseconds: 1200);
}

// ---------------------------------------------------------------------------
// Donnees mockees — [FIREBASE] remplacer par Firestore queries
// ---------------------------------------------------------------------------

/// [FIREBASE] Prenom depuis le document utilisateur Firestore
const String _userFirstName = 'Alexandre';

/// [FIREBASE] Points actuels depuis Firestore
const int _currentPoints = 1240;

/// [FIREBASE] Seuil de la prochaine recompense
const int _nextRewardThreshold = 1500;

/// [FIREBASE] Label de la prochaine recompense
const String _nextRewardLabel = 'Dessert signature offert';

/// [FIREBASE] Nombre de notifications non lues
const int _unreadNotifications = 3;

/// [FIREBASE] Liste des recompenses depuis Firestore
const List<Map<String, dynamic>> _rewards = [
  {
    'name': 'Cafe espresso',
    'points': 200,
    'imagePlaceholder': 'cafe',
    'unlocked': true,
  },
  {
    'name': 'Entree du chef',
    'points': 500,
    'imagePlaceholder': 'entree',
    'unlocked': true,
  },
  {
    'name': 'Cocktail maison',
    'points': 800,
    'imagePlaceholder': 'cocktail',
    'unlocked': true,
  },
  {
    'name': 'Dessert signature',
    'points': 1500,
    'imagePlaceholder': 'dessert',
    'unlocked': false,
  },
  {
    'name': 'Repas gastronomique',
    'points': 3000,
    'imagePlaceholder': 'repas',
    'unlocked': false,
  },
  {
    'name': 'Experience privee',
    'points': 5000,
    'imagePlaceholder': 'experience',
    'unlocked': false,
  },
];

/// [FIREBASE] Liste des promotions actives depuis Firestore
const List<Map<String, dynamic>> _promotions = [
  {
    'title': 'Soiree accords mets & vins',
    'subtitle': 'Points doubles tout le week-end',
    'badge': '2X POINTS',
    'gradientStart': Color(0xFF2A1F0E),
    'gradientEnd': Color(0xFF1A1A1A),
    'accentColor': Color(0xFFD4AF37),
  },
  {
    'title': 'Menu decouverte printemps',
    'subtitle': 'Nouveau menu — 500 pts bonus a la premiere commande',
    'badge': '+500 PTS',
    'gradientStart': Color(0xFF0E2A1A),
    'gradientEnd': Color(0xFF1A1A1A),
    'accentColor': Color(0xFF6FCF97),
  },
  {
    'title': 'Happy Hour exclusif',
    'subtitle': 'Cocktails signatures a moitie prix — membres seulement',
    'badge': '-50%',
    'gradientStart': Color(0xFF2A0E1F),
    'gradientEnd': Color(0xFF1A1A1A),
    'accentColor': Color(0xFFCF6679),
  },
];

// ---------------------------------------------------------------------------
// Icones pour les onglets (representations visuelles sans images)
// ---------------------------------------------------------------------------

/// Map d'icones pour le placeholder des recompenses
const Map<String, IconData> _rewardIcons = {
  'cafe': Icons.coffee_rounded,
  'entree': Icons.restaurant_rounded,
  'cocktail': Icons.local_bar_rounded,
  'dessert': Icons.cake_rounded,
  'repas': Icons.dining_rounded,
  'experience': Icons.auto_awesome_rounded,
};

// ---------------------------------------------------------------------------
// Widget principal — HomePage
// ---------------------------------------------------------------------------

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with TickerProviderStateMixin {
  int _currentNavIndex = 0;

  // Animation controllers
  late final AnimationController _bgAnimController;
  late final AnimationController _entranceController;
  late final AnimationController _progressAnimController;
  late final AnimationController _scannerPulseController;

  // Animations
  late final Animation<double> _fadeEntrance;
  late final Animation<double> _progressValue;
  late final Animation<double> _scannerPulse;

  @override
  void initState() {
    super.initState();
    _initAnimations();

    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
      ),
    );
  }

  void _initAnimations() {
    // Rotation lente du gradient de fond (coherent avec login_screen)
    _bgAnimController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 15),
    )..repeat();

    // Fade-in echelonne du contenu
    _entranceController = AnimationController(
      vsync: this,
      duration: _MaisonTokens.animVerySlow,
    );
    _fadeEntrance = CurvedAnimation(
      parent: _entranceController,
      curve: Curves.easeOut,
    );

    // Animation de la barre de progression
    _progressAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    );
    _progressValue = Tween<double>(
      begin: 0.0,
      end: _currentPoints / _nextRewardThreshold,
    ).animate(CurvedAnimation(
      parent: _progressAnimController,
      curve: Curves.easeOutCubic,
    ));

    // Pulse du bouton scanner
    _scannerPulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    )..repeat(reverse: true);
    _scannerPulse = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(
        parent: _scannerPulseController,
        curve: Curves.easeInOut,
      ),
    );

    // Demarrer les animations d'entree avec un leger delai
    Future.delayed(const Duration(milliseconds: 100), () {
      if (mounted) {
        _entranceController.forward();
        _progressAnimController.forward();
      }
    });
  }

  @override
  void dispose() {
    _bgAnimController.dispose();
    _entranceController.dispose();
    _progressAnimController.dispose();
    _scannerPulseController.dispose();
    super.dispose();
  }

  // -------------------------------------------------------------------------
  // [FIREBASE] Navigation callbacks
  // -------------------------------------------------------------------------

  /// [FIREBASE] Ouvrir l'ecran de notifications
  void _onNotificationsTap() {
    // TODO: [FIREBASE] Navigator.push vers NotificationsScreen
  }

  /// [FIREBASE] Ouvrir le detail d'une recompense
  void _onRewardTap(Map<String, dynamic> reward) {
    // TODO: [FIREBASE] Navigator.push vers RewardDetailScreen
  }

  /// [FIREBASE] Ouvrir le detail d'une promotion
  void _onPromotionTap(Map<String, dynamic> promotion) {
    // TODO: [FIREBASE] Navigator.push vers PromotionDetailScreen
  }

  /// [FIREBASE] Ouvrir le scanner QR
  void _onScannerTap() {
    // TODO: [FIREBASE] Navigator.push vers ScannerScreen
  }

  /// [FIREBASE] Gerer la navigation par onglets
  void _onNavTap(int index) {
    if (index == 2) {
      _onScannerTap();
      return;
    }
    setState(() => _currentNavIndex = index);
    // TODO: [FIREBASE] Naviguer vers le bon ecran selon l'index
    // 0 = Accueil, 1 = Recompenses, 3 = Historique, 4 = Profil
  }

  // -------------------------------------------------------------------------
  // Build principal
  // -------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _MaisonTokens.charcoal,
      extendBody: true,
      body: Stack(
        children: [
          // Fond anime
          _HomeAnimatedBackground(controller: _bgAnimController),

          // Vignette
          const _HomeVignette(),

          // Contenu scrollable
          SafeArea(
            bottom: false,
            child: FadeTransition(
              opacity: _fadeEntrance,
              child: CustomScrollView(
                physics: const BouncingScrollPhysics(
                  parent: AlwaysScrollableScrollPhysics(),
                ),
                slivers: [
                  // Spacing top
                  const SliverToBoxAdapter(
                    child: SizedBox(height: _MaisonTokens.spacingM),
                  ),

                  // 1. Header
                  SliverToBoxAdapter(
                    child: _StaggeredFadeSlide(
                      controller: _entranceController,
                      intervalStart: 0.0,
                      intervalEnd: 0.3,
                      child: _buildHeader(),
                    ),
                  ),

                  const SliverToBoxAdapter(
                    child: SizedBox(height: _MaisonTokens.spacingL),
                  ),

                  // 2. Salutation personnalisee
                  SliverToBoxAdapter(
                    child: _StaggeredFadeSlide(
                      controller: _entranceController,
                      intervalStart: 0.1,
                      intervalEnd: 0.4,
                      child: _buildGreeting(),
                    ),
                  ),

                  const SliverToBoxAdapter(
                    child: SizedBox(height: _MaisonTokens.spacingL),
                  ),

                  // 3. Card de progression
                  SliverToBoxAdapter(
                    child: _StaggeredFadeSlide(
                      controller: _entranceController,
                      intervalStart: 0.2,
                      intervalEnd: 0.55,
                      child: _buildProgressCard(),
                    ),
                  ),

                  const SliverToBoxAdapter(
                    child: SizedBox(height: _MaisonTokens.spacingXl),
                  ),

                  // 4. Section recompenses — titre
                  SliverToBoxAdapter(
                    child: _StaggeredFadeSlide(
                      controller: _entranceController,
                      intervalStart: 0.3,
                      intervalEnd: 0.6,
                      child: _buildSectionTitle(
                        'Recompenses',
                        'Echangez vos points',
                      ),
                    ),
                  ),

                  const SliverToBoxAdapter(
                    child: SizedBox(height: _MaisonTokens.spacingM),
                  ),

                  // 4. Section recompenses — carousel horizontal
                  SliverToBoxAdapter(
                    child: _StaggeredFadeSlide(
                      controller: _entranceController,
                      intervalStart: 0.35,
                      intervalEnd: 0.65,
                      child: _buildRewardsCarousel(),
                    ),
                  ),

                  const SliverToBoxAdapter(
                    child: SizedBox(height: _MaisonTokens.spacingXl),
                  ),

                  // 5. Section promotions — titre
                  SliverToBoxAdapter(
                    child: _StaggeredFadeSlide(
                      controller: _entranceController,
                      intervalStart: 0.45,
                      intervalEnd: 0.75,
                      child: _buildSectionTitle(
                        'Promotions',
                        'Offres exclusives membres',
                      ),
                    ),
                  ),

                  const SliverToBoxAdapter(
                    child: SizedBox(height: _MaisonTokens.spacingM),
                  ),

                  // 5. Section promotions — liste
                  SliverToBoxAdapter(
                    child: _StaggeredFadeSlide(
                      controller: _entranceController,
                      intervalStart: 0.5,
                      intervalEnd: 0.85,
                      child: _buildPromotions(),
                    ),
                  ),

                  // Bottom padding pour la nav bar
                  const SliverToBoxAdapter(
                    child: SizedBox(height: 120),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),

      // 6. Bottom navigation bar
      bottomNavigationBar: _buildBottomNavBar(),
    );
  }

  // -------------------------------------------------------------------------
  // 1. Header — logo + points + notifications
  // -------------------------------------------------------------------------

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: _MaisonTokens.spacingL),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Logo MAISON compact
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'MAISON',
                style: GoogleFonts.playfairDisplay(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 6,
                  color: _MaisonTokens.offWhite,
                ),
              ),
              const SizedBox(height: 2),
              Container(
                width: 32,
                height: 1.5,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      _MaisonTokens.goldChampagne,
                      _MaisonTokens.goldChampagne.withValues(alpha: 0.0),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(1),
                ),
              ),
            ],
          ),

          const Spacer(),

          // Affichage des points
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: _MaisonTokens.spacingM,
              vertical: _MaisonTokens.spacingS + 2,
            ),
            decoration: BoxDecoration(
              color: _MaisonTokens.goldSubtle,
              borderRadius: BorderRadius.circular(_MaisonTokens.radiusXxl),
              border: Border.all(
                color: _MaisonTokens.goldChampagne.withValues(alpha: 0.25),
                width: 1,
              ),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.stars_rounded,
                  color: _MaisonTokens.goldChampagne,
                  size: 18,
                ),
                const SizedBox(width: _MaisonTokens.spacingS),
                Text(
                  _formatPoints(_currentPoints),
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: _MaisonTokens.goldLight,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(width: 2),
                Text(
                  ' pts',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: _MaisonTokens.goldChampagne.withValues(alpha: 0.7),
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(width: _MaisonTokens.spacingM),

          // Icone notifications
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: _MaisonTokens.cardGlass,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: _MaisonTokens.cardGlassBorder,
                    width: 1,
                  ),
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: _onNotificationsTap,
                    customBorder: const CircleBorder(),
                    splashColor: _MaisonTokens.goldSubtle,
                    child: const Icon(
                      Icons.notifications_outlined,
                      color: _MaisonTokens.offWhite,
                      size: 22,
                    ),
                  ),
                ),
              ),
              // Badge de notifications
              if (_unreadNotifications > 0)
                Positioned(
                  right: -2,
                  top: -2,
                  child: Container(
                    width: 20,
                    height: 20,
                    decoration: BoxDecoration(
                      color: _MaisonTokens.goldChampagne,
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: _MaisonTokens.charcoal,
                        width: 2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: _MaisonTokens.goldChampagne.withValues(alpha: 0.4),
                          blurRadius: 8,
                          spreadRadius: 1,
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        '$_unreadNotifications',
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: _MaisonTokens.charcoal,
                          height: 1,
                        ),
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------------------
  // 2. Salutation personnalisee
  // -------------------------------------------------------------------------

  Widget _buildGreeting() {
    final int remaining = _nextRewardThreshold - _currentPoints;
    final String motivationalText = remaining <= 100
        ? 'Vous y etes presque — plus que $remaining points !'
        : 'Encore $remaining points avant votre prochaine recompense.';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: _MaisonTokens.spacingL),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Bonjour, ',
                style: GoogleFonts.inter(
                  fontSize: 28,
                  fontWeight: FontWeight.w300,
                  color: _MaisonTokens.offWhite,
                  height: 1.2,
                ),
              ),
              Text(
                _userFirstName,
                style: GoogleFonts.playfairDisplay(
                  fontSize: 28,
                  fontWeight: FontWeight.w600,
                  color: _MaisonTokens.goldChampagne,
                  height: 1.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: _MaisonTokens.spacingS),
          Text(
            motivationalText,
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w400,
              color: _MaisonTokens.offWhiteSecondary,
              height: 1.5,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------------------
  // 3. Card de progression vers la prochaine recompense
  // -------------------------------------------------------------------------

  Widget _buildProgressCard() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: _MaisonTokens.spacingL),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(_MaisonTokens.radiusXl),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Color(0xFF262218),
              Color(0xFF1E1E1E),
              Color(0xFF1C1F1E),
            ],
          ),
          border: Border.all(
            color: _MaisonTokens.goldChampagne.withValues(alpha: 0.15),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: _MaisonTokens.goldChampagne.withValues(alpha: 0.06),
              blurRadius: 30,
              offset: const Offset(0, 10),
            ),
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 20,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(_MaisonTokens.radiusXl),
          child: Stack(
            children: [
              // Effet de lumiere decoratif en haut a droite
              Positioned(
                right: -30,
                top: -30,
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        _MaisonTokens.goldChampagne.withValues(alpha: 0.08),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),

              // Contenu de la card
              Padding(
                padding: const EdgeInsets.all(_MaisonTokens.spacingL),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Titre + icone
                    Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: _MaisonTokens.goldSubtle,
                            borderRadius: BorderRadius.circular(
                              _MaisonTokens.radiusMd,
                            ),
                          ),
                          child: const Icon(
                            Icons.emoji_events_rounded,
                            color: _MaisonTokens.goldChampagne,
                            size: 22,
                          ),
                        ),
                        const SizedBox(width: _MaisonTokens.spacingM),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Prochaine recompense',
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: _MaisonTokens.offWhiteSecondary,
                                  letterSpacing: 1.5,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _nextRewardLabel,
                                style: GoogleFonts.playfairDisplay(
                                  fontSize: 17,
                                  fontWeight: FontWeight.w600,
                                  color: _MaisonTokens.offWhite,
                                  height: 1.3,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: _MaisonTokens.spacingL),

                    // Barre de progression animee
                    AnimatedBuilder(
                      animation: _progressValue,
                      builder: (context, child) {
                        return _GoldProgressBar(
                          progress: _progressValue.value,
                          height: 10,
                        );
                      },
                    ),

                    const SizedBox(height: _MaisonTokens.spacingM),

                    // Points actuels vs objectif
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        RichText(
                          text: TextSpan(
                            children: [
                              TextSpan(
                                text: _formatPoints(_currentPoints),
                                style: GoogleFonts.inter(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w700,
                                  color: _MaisonTokens.goldChampagne,
                                ),
                              ),
                              TextSpan(
                                text: ' pts',
                                style: GoogleFonts.inter(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w400,
                                  color: _MaisonTokens.offWhiteSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        RichText(
                          text: TextSpan(
                            children: [
                              TextSpan(
                                text: _formatPoints(_nextRewardThreshold),
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: _MaisonTokens.offWhiteSecondary,
                                ),
                              ),
                              TextSpan(
                                text: ' pts',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w400,
                                  color: _MaisonTokens.offWhiteSecondary
                                      .withValues(alpha: 0.6),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Section title helper
  // -------------------------------------------------------------------------

  Widget _buildSectionTitle(String title, String subtitle) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: _MaisonTokens.spacingL),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title.toUpperCase(),
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: _MaisonTokens.goldChampagne,
                  letterSpacing: 3,
                ),
              ),
              const SizedBox(height: _MaisonTokens.spacingXs),
              Text(
                subtitle,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.w400,
                  color: _MaisonTokens.offWhiteSecondary,
                  letterSpacing: 0.2,
                ),
              ),
            ],
          ),
          const Spacer(),
          Text(
            'Voir tout',
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: _MaisonTokens.goldChampagne.withValues(alpha: 0.7),
              letterSpacing: 0.3,
            ),
          ),
          const SizedBox(width: 4),
          Icon(
            Icons.arrow_forward_ios_rounded,
            size: 12,
            color: _MaisonTokens.goldChampagne.withValues(alpha: 0.7),
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------------------
  // 4. Carousel horizontal des recompenses
  // -------------------------------------------------------------------------

  Widget _buildRewardsCarousel() {
    return SizedBox(
      height: 200,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(
          horizontal: _MaisonTokens.spacingL,
        ),
        itemCount: _rewards.length,
        itemBuilder: (context, index) {
          final reward = _rewards[index];
          final bool isUnlocked = reward['unlocked'] as bool;
          final int rewardPoints = reward['points'] as int;
          final String name = reward['name'] as String;
          final String imagePlaceholder = reward['imagePlaceholder'] as String;

          return Padding(
            padding: EdgeInsets.only(
              right: index < _rewards.length - 1 ? _MaisonTokens.spacingM : 0,
            ),
            child: GestureDetector(
              onTap: () => _onRewardTap(reward),
              child: _RewardCard(
                name: name,
                points: rewardPoints,
                icon: _rewardIcons[imagePlaceholder] ?? Icons.card_giftcard_rounded,
                isUnlocked: isUnlocked,
                currentPoints: _currentPoints,
              ),
            ),
          );
        },
      ),
    );
  }

  // -------------------------------------------------------------------------
  // 5. Section promotions
  // -------------------------------------------------------------------------

  Widget _buildPromotions() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: _MaisonTokens.spacingL),
      child: Column(
        children: _promotions.asMap().entries.map((entry) {
          final int index = entry.key;
          final Map<String, dynamic> promo = entry.value;

          return Padding(
            padding: EdgeInsets.only(
              bottom: index < _promotions.length - 1
                  ? _MaisonTokens.spacingM
                  : 0,
            ),
            child: GestureDetector(
              onTap: () => _onPromotionTap(promo),
              child: _PromotionCard(
                title: promo['title'] as String,
                subtitle: promo['subtitle'] as String,
                badge: promo['badge'] as String,
                gradientStart: promo['gradientStart'] as Color,
                gradientEnd: promo['gradientEnd'] as Color,
                accentColor: promo['accentColor'] as Color,
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  // -------------------------------------------------------------------------
  // 6. Bottom navigation bar premium
  // -------------------------------------------------------------------------

  Widget _buildBottomNavBar() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xF5161616),
        border: Border(
          top: BorderSide(
            color: _MaisonTokens.divider.withValues(alpha: 0.5),
            width: 0.5,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.4),
            blurRadius: 20,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.only(
            top: _MaisonTokens.spacingS,
            bottom: _MaisonTokens.spacingXs,
            left: _MaisonTokens.spacingS,
            right: _MaisonTokens.spacingS,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(0, Icons.home_rounded, 'Accueil'),
              _buildNavItem(1, Icons.card_giftcard_rounded, 'Recompenses'),
              // Bouton scanner central sureleve
              _buildScannerButton(),
              _buildNavItem(3, Icons.receipt_long_rounded, 'Historique'),
              _buildNavItem(4, Icons.person_outline_rounded, 'Profil'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final bool isActive = _currentNavIndex == index;

    return GestureDetector(
      onTap: () => _onNavTap(index),
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        width: 60,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedContainer(
              duration: _MaisonTokens.animFast,
              curve: Curves.easeOut,
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: isActive
                    ? _MaisonTokens.goldSubtle
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(_MaisonTokens.radiusSm),
              ),
              child: Icon(
                icon,
                size: 22,
                color: isActive
                    ? _MaisonTokens.goldChampagne
                    : _MaisonTokens.offWhiteSecondary.withValues(alpha: 0.6),
              ),
            ),
            const SizedBox(height: _MaisonTokens.spacingXs),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 10,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                color: isActive
                    ? _MaisonTokens.goldChampagne
                    : _MaisonTokens.offWhiteSecondary.withValues(alpha: 0.5),
                letterSpacing: 0.2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScannerButton() {
    return GestureDetector(
      onTap: _onScannerTap,
      child: AnimatedBuilder(
        animation: _scannerPulse,
        builder: (context, child) {
          return Container(
            width: 62,
            height: 62,
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  _MaisonTokens.goldChampagne,
                  Color(0xFFBF9B30),
                ],
              ),
              boxShadow: [
                BoxShadow(
                  color: _MaisonTokens.goldChampagne
                      .withValues(alpha: 0.3 * _scannerPulse.value),
                  blurRadius: 20 + (10 * _scannerPulse.value),
                  spreadRadius: 2 * _scannerPulse.value,
                ),
                BoxShadow(
                  color: _MaisonTokens.goldChampagne
                      .withValues(alpha: 0.15 * _scannerPulse.value),
                  blurRadius: 40,
                  spreadRadius: 5 * _scannerPulse.value,
                ),
              ],
            ),
            child: Transform.scale(
              scale: 0.95 + (0.05 * _scannerPulse.value),
              child: const Icon(
                Icons.qr_code_scanner_rounded,
                color: _MaisonTokens.charcoal,
                size: 28,
              ),
            ),
          );
        },
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /// Formate les points avec separateur de milliers
  String _formatPoints(int points) {
    if (points < 1000) return points.toString();
    final String str = points.toString();
    final int len = str.length;
    final StringBuffer buffer = StringBuffer();
    for (int i = 0; i < len; i++) {
      if (i > 0 && (len - i) % 3 == 0) {
        buffer.write('\u00A0'); // espace insecable
      }
      buffer.write(str[i]);
    }
    return buffer.toString();
  }
}

// ===========================================================================
// Widgets extraits — Composants reutilisables
// ===========================================================================

// ---------------------------------------------------------------------------
// Barre de progression doree avec effet shimmer
// ---------------------------------------------------------------------------

class _GoldProgressBar extends StatelessWidget {
  final double progress;
  final double height;

  const _GoldProgressBar({
    required this.progress,
    this.height = 8,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      decoration: BoxDecoration(
        color: _MaisonTokens.progressBg,
        borderRadius: BorderRadius.circular(height / 2),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final double width = constraints.maxWidth * progress.clamp(0.0, 1.0);
          return Stack(
            children: [
              // Barre de progression avec gradient
              AnimatedContainer(
                duration: _MaisonTokens.animFast,
                width: width,
                height: height,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(height / 2),
                  gradient: const LinearGradient(
                    colors: [
                      Color(0xFFBF9B30),
                      _MaisonTokens.goldChampagne,
                      _MaisonTokens.goldLight,
                    ],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: _MaisonTokens.goldChampagne.withValues(alpha: 0.4),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
              ),

              // Shimmer effect statique (point lumineux au bout de la barre)
              if (width > height)
                Positioned(
                  right: constraints.maxWidth - width,
                  top: 0,
                  child: Container(
                    width: height + 4,
                    height: height,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(height / 2),
                      gradient: RadialGradient(
                        colors: [
                          Colors.white.withValues(alpha: 0.5),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Card de recompense individuelle
// ---------------------------------------------------------------------------

class _RewardCard extends StatelessWidget {
  final String name;
  final int points;
  final IconData icon;
  final bool isUnlocked;
  final int currentPoints;

  const _RewardCard({
    required this.name,
    required this.points,
    required this.icon,
    required this.isUnlocked,
    required this.currentPoints,
  });

  @override
  Widget build(BuildContext context) {
    final bool canRedeem = currentPoints >= points;

    return Container(
      width: 145,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(_MaisonTokens.radiusXl),
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: isUnlocked
              ? [
                  const Color(0xFF262218),
                  const Color(0xFF1E1D1A),
                ]
              : [
                  _MaisonTokens.cardGlass,
                  const Color(0xFF1C1C1C),
                ],
        ),
        border: Border.all(
          color: isUnlocked
              ? _MaisonTokens.goldChampagne.withValues(alpha: 0.2)
              : _MaisonTokens.cardGlassBorder,
          width: 1,
        ),
        boxShadow: [
          if (isUnlocked)
            BoxShadow(
              color: _MaisonTokens.goldChampagne.withValues(alpha: 0.08),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Contenu principal
          Padding(
            padding: const EdgeInsets.all(_MaisonTokens.spacingM),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Icone placeholder pour l'image
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: isUnlocked
                        ? _MaisonTokens.goldSubtle
                        : _MaisonTokens.progressBg,
                    borderRadius: BorderRadius.circular(
                      _MaisonTokens.radiusMd,
                    ),
                  ),
                  child: Icon(
                    icon,
                    size: 26,
                    color: isUnlocked
                        ? _MaisonTokens.goldChampagne
                        : _MaisonTokens.locked,
                  ),
                ),

                const Spacer(),

                // Nom de la recompense
                Text(
                  name,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isUnlocked
                        ? _MaisonTokens.offWhite
                        : _MaisonTokens.offWhiteSecondary,
                    height: 1.3,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),

                const SizedBox(height: _MaisonTokens.spacingS),

                // Points requis
                Row(
                  children: [
                    Icon(
                      Icons.stars_rounded,
                      size: 14,
                      color: isUnlocked
                          ? _MaisonTokens.goldChampagne
                          : _MaisonTokens.locked,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '$points pts',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: isUnlocked
                            ? _MaisonTokens.goldChampagne
                            : _MaisonTokens.locked,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Badge "Echanger" ou cadenas
          Positioned(
            top: _MaisonTokens.spacingS,
            right: _MaisonTokens.spacingS,
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 8,
                vertical: 4,
              ),
              decoration: BoxDecoration(
                color: canRedeem && isUnlocked
                    ? _MaisonTokens.goldChampagne
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(_MaisonTokens.radiusSm),
                border: canRedeem && isUnlocked
                    ? null
                    : Border.all(
                        color: _MaisonTokens.cardGlassBorder,
                        width: 1,
                      ),
              ),
              child: canRedeem && isUnlocked
                  ? Text(
                      'Echanger',
                      style: GoogleFonts.inter(
                        fontSize: 9,
                        fontWeight: FontWeight.w700,
                        color: _MaisonTokens.charcoal,
                        letterSpacing: 0.3,
                      ),
                    )
                  : Icon(
                      Icons.lock_outline_rounded,
                      size: 12,
                      color: _MaisonTokens.locked,
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Card de promotion
// ---------------------------------------------------------------------------

class _PromotionCard extends StatelessWidget {
  final String title;
  final String subtitle;
  final String badge;
  final Color gradientStart;
  final Color gradientEnd;
  final Color accentColor;

  const _PromotionCard({
    required this.title,
    required this.subtitle,
    required this.badge,
    required this.gradientStart,
    required this.gradientEnd,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(_MaisonTokens.radiusXl),
        gradient: LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [gradientStart, gradientEnd],
        ),
        border: Border.all(
          color: accentColor.withValues(alpha: 0.15),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: accentColor.withValues(alpha: 0.06),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(_MaisonTokens.radiusXl),
        child: Stack(
          children: [
            // Cercle decoratif
            Positioned(
              right: -20,
              top: -20,
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      accentColor.withValues(alpha: 0.1),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),

            // Contenu
            Padding(
              padding: const EdgeInsets.all(_MaisonTokens.spacingL),
              child: Row(
                children: [
                  // Texte
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Badge
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: accentColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(
                              _MaisonTokens.radiusSm,
                            ),
                            border: Border.all(
                              color: accentColor.withValues(alpha: 0.3),
                              width: 1,
                            ),
                          ),
                          child: Text(
                            badge,
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: accentColor,
                              letterSpacing: 1,
                            ),
                          ),
                        ),

                        const SizedBox(height: _MaisonTokens.spacingM),

                        // Titre
                        Text(
                          title,
                          style: GoogleFonts.playfairDisplay(
                            fontSize: 17,
                            fontWeight: FontWeight.w600,
                            color: _MaisonTokens.offWhite,
                            height: 1.3,
                          ),
                        ),

                        const SizedBox(height: _MaisonTokens.spacingS),

                        // Sous-titre
                        Text(
                          subtitle,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w400,
                            color: _MaisonTokens.offWhiteSecondary,
                            height: 1.4,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(width: _MaisonTokens.spacingM),

                  // Fleche
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: 0.1),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: accentColor.withValues(alpha: 0.2),
                        width: 1,
                      ),
                    ),
                    child: Icon(
                      Icons.arrow_forward_rounded,
                      size: 20,
                      color: accentColor,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Animation echelonnee — fade + slide pour chaque section
// ---------------------------------------------------------------------------

class _StaggeredFadeSlide extends StatelessWidget {
  final AnimationController controller;
  final double intervalStart;
  final double intervalEnd;
  final Widget child;

  const _StaggeredFadeSlide({
    required this.controller,
    required this.intervalStart,
    required this.intervalEnd,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final Animation<double> fade = CurvedAnimation(
      parent: controller,
      curve: Interval(intervalStart, intervalEnd, curve: Curves.easeOut),
    );

    final Animation<Offset> slide = Tween<Offset>(
      begin: const Offset(0, 0.08),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: controller,
      curve: Interval(intervalStart, intervalEnd, curve: Curves.easeOutCubic),
    ));

    return FadeTransition(
      opacity: fade,
      child: SlideTransition(
        position: slide,
        child: child,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Fond anime — gradient subtil avec halos dores flottants
// ---------------------------------------------------------------------------

class _HomeAnimatedBackground extends StatelessWidget {
  final AnimationController controller;

  const _HomeAnimatedBackground({required this.controller});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        return CustomPaint(
          painter: _HomeBgPainter(rotation: controller.value * 2 * math.pi),
          size: MediaQuery.of(context).size,
        );
      },
    );
  }
}

class _HomeBgPainter extends CustomPainter {
  final double rotation;

  _HomeBgPainter({required this.rotation});

  @override
  void paint(Canvas canvas, Size size) {
    // Fond solide
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = _MaisonTokens.charcoal,
    );

    // Halo dore subtil — en haut a droite, se deplace lentement
    final c1x = size.width * 0.8 + math.cos(rotation) * size.width * 0.04;
    final c1y = size.height * 0.08 + math.sin(rotation) * size.height * 0.02;
    final glow1 = Paint()
      ..shader = RadialGradient(
        colors: [
          _MaisonTokens.goldChampagne.withValues(alpha: 0.05),
          _MaisonTokens.goldChampagne.withValues(alpha: 0.015),
          Colors.transparent,
        ],
        stops: const [0.0, 0.4, 1.0],
      ).createShader(
        Rect.fromCircle(center: Offset(c1x, c1y), radius: size.width * 0.55),
      );
    canvas.drawCircle(Offset(c1x, c1y), size.width * 0.55, glow1);

    // Deuxieme halo — en bas a gauche
    final c2x = size.width * 0.15 + math.sin(rotation * 0.6) * size.width * 0.03;
    final c2y = size.height * 0.6 + math.cos(rotation * 0.6) * size.height * 0.02;
    final glow2 = Paint()
      ..shader = RadialGradient(
        colors: [
          _MaisonTokens.goldChampagne.withValues(alpha: 0.03),
          Colors.transparent,
        ],
        stops: const [0.0, 1.0],
      ).createShader(
        Rect.fromCircle(center: Offset(c2x, c2y), radius: size.width * 0.4),
      );
    canvas.drawCircle(Offset(c2x, c2y), size.width * 0.4, glow2);

    // Troisieme halo tres subtil — milieu
    final c3x = size.width * 0.5 + math.cos(rotation * 0.4) * size.width * 0.06;
    final c3y = size.height * 0.35 + math.sin(rotation * 0.4) * size.height * 0.03;
    final glow3 = Paint()
      ..shader = RadialGradient(
        colors: [
          _MaisonTokens.goldChampagne.withValues(alpha: 0.02),
          Colors.transparent,
        ],
        stops: const [0.0, 1.0],
      ).createShader(
        Rect.fromCircle(center: Offset(c3x, c3y), radius: size.width * 0.35),
      );
    canvas.drawCircle(Offset(c3x, c3y), size.width * 0.35, glow3);
  }

  @override
  bool shouldRepaint(covariant _HomeBgPainter oldDelegate) =>
      oldDelegate.rotation != rotation;
}

// ---------------------------------------------------------------------------
// Vignette cinematique
// ---------------------------------------------------------------------------

class _HomeVignette extends StatelessWidget {
  const _HomeVignette();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: SizedBox.expand(
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: const Alignment(0, -0.4),
              radius: 1.3,
              colors: [
                Colors.transparent,
                _MaisonTokens.charcoal.withValues(alpha: 0.4),
                _MaisonTokens.charcoal.withValues(alpha: 0.85),
              ],
              stops: const [0.35, 0.75, 1.0],
            ),
          ),
        ),
      ),
    );
  }
}
