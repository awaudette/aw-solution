import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:math' as math;

/// ---------------------------------------------------------------------------
/// MAISON — Login Screen
/// ---------------------------------------------------------------------------
/// Ecran de connexion premium pour l'app de fidelite "MAISON".
/// Design : luxe sombre, or champagne, typographie fine.
///
/// Points d'integration Firebase Auth :
///   - [FIREBASE] onLoginPressed()
///   - [FIREBASE] onGoogleSignInPressed()
///   - [FIREBASE] onForgotPasswordPressed()
///   - [FIREBASE] onCreateAccountPressed()
/// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Design tokens — a externaliser dans lib/theme/ pour le design system global
// ---------------------------------------------------------------------------

class _MaisonTokens {
  _MaisonTokens._();

  // Couleurs
  static const Color charcoal = Color(0xFF1A1A1A);
  static const Color charcoalLight = Color(0xFF2A2A2A);
  static const Color charcoalMid = Color(0xFF232323);
  static const Color surface = Color(0xFF1E1E1E);
  static const Color goldChampagne = Color(0xFFD4AF37);
  static const Color goldLight = Color(0xFFE8D48B);
  static const Color goldSubtle = Color(0x33D4AF37); // 20 % opacity
  static const Color offWhite = Color(0xFFF5F0E8);
  static const Color offWhiteSecondary = Color(0xFFB0A89A);
  static const Color divider = Color(0xFF3A3A3A);
  static const Color error = Color(0xFFCF6679);
  static const Color inputFill = Color(0xFF252525);
  static const Color inputBorder = Color(0xFF3D3D3D);
  static const Color inputBorderFocused = Color(0xFFD4AF37);

  // Rayons
  static const double radiusSm = 8.0;
  static const double radiusMd = 12.0;
  static const double radiusLg = 16.0;

  // Espacements
  static const double spacingXs = 4.0;
  static const double spacingS = 8.0;
  static const double spacingM = 16.0;
  static const double spacingL = 24.0;
  static const double spacingXl = 32.0;
  static const double spacingXxl = 48.0;

  // Durees d'animation
  static const Duration animFast = Duration(milliseconds: 400);
  static const Duration animMedium = Duration(milliseconds: 600);
  static const Duration animSlow = Duration(milliseconds: 800);
  static const Duration animVerySlow = Duration(milliseconds: 1000);
}

// ---------------------------------------------------------------------------
// Widget principal
// ---------------------------------------------------------------------------

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with TickerProviderStateMixin {
  // Controllers de saisie — prets pour Firebase Auth
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final FocusNode _emailFocus = FocusNode();
  final FocusNode _passwordFocus = FocusNode();

  bool _obscurePassword = true;
  bool _isLoading = false;

  // Animations
  late final AnimationController _bgAnimController;
  late final AnimationController _fadeController;
  late final AnimationController _slideController;
  late final AnimationController _buttonPulseController;

  late final Animation<double> _fadeAnim;
  late final Animation<Offset> _slideLogo;
  late final Animation<Offset> _slideForm;
  late final Animation<Offset> _slideBottom;
  late final Animation<double> _buttonPulse;

  @override
  void initState() {
    super.initState();
    _initAnimations();

    // Barre d'etat transparente pour l'immersion
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        statusBarBrightness: Brightness.dark,
      ),
    );
  }

  void _initAnimations() {
    // Rotation lente du gradient de fond
    _bgAnimController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 12),
    )..repeat();

    // Fade-in general
    _fadeController = AnimationController(
      vsync: this,
      duration: _MaisonTokens.animSlow,
    );
    _fadeAnim = CurvedAnimation(
      parent: _fadeController,
      curve: Curves.easeOut,
    );

    // Slide echelonne : logo, formulaire, bas de page
    _slideController = AnimationController(
      vsync: this,
      duration: _MaisonTokens.animVerySlow,
    );

    _slideLogo = Tween<Offset>(
      begin: const Offset(0, -0.15),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: const Interval(0.0, 0.5, curve: Curves.easeOutCubic),
    ));

    _slideForm = Tween<Offset>(
      begin: const Offset(0, 0.12),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: const Interval(0.25, 0.75, curve: Curves.easeOutCubic),
    ));

    _slideBottom = Tween<Offset>(
      begin: const Offset(0, 0.2),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideController,
      curve: const Interval(0.5, 1.0, curve: Curves.easeOutCubic),
    ));

    // Pulse subtil sur le bouton principal
    _buttonPulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2000),
    )..repeat(reverse: true);
    _buttonPulse = Tween<double>(begin: 0.92, end: 1.0).animate(
      CurvedAnimation(
        parent: _buttonPulseController,
        curve: Curves.easeInOut,
      ),
    );

    // Demarrer les animations d'entree
    _fadeController.forward();
    _slideController.forward();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _emailFocus.dispose();
    _passwordFocus.dispose();
    _bgAnimController.dispose();
    _fadeController.dispose();
    _slideController.dispose();
    _buttonPulseController.dispose();
    super.dispose();
  }

  // -------------------------------------------------------------------------
  // [FIREBASE] Callbacks — brancher Firebase Auth ici
  // -------------------------------------------------------------------------

  /// [FIREBASE] Connexion email / mot de passe.
  /// Utiliser : FirebaseAuth.instance.signInWithEmailAndPassword(
  ///   email: _emailController.text.trim(),
  ///   password: _passwordController.text,
  /// )
  Future<void> _onLoginPressed() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;

    if (email.isEmpty || password.isEmpty) return;

    setState(() => _isLoading = true);

    // TODO: [FIREBASE] Remplacer par l'appel Firebase Auth
    await Future.delayed(const Duration(seconds: 2)); // Simule un delai reseau

    if (mounted) setState(() => _isLoading = false);
  }

  /// [FIREBASE] Connexion via Google Sign-In.
  /// Utiliser : GoogleSignIn + FirebaseAuth.instance.signInWithCredential()
  Future<void> _onGoogleSignInPressed() async {
    // TODO: [FIREBASE] Implementer Google Sign-In
  }

  /// [FIREBASE] Reinitialisation du mot de passe.
  /// Utiliser : FirebaseAuth.instance.sendPasswordResetEmail(email: ...)
  void _onForgotPasswordPressed() {
    // TODO: [FIREBASE] Naviguer vers l'ecran de reinitialisation
    //       ou afficher un dialog avec champ email
  }

  /// [FIREBASE] Navigation vers l'ecran d'inscription.
  void _onCreateAccountPressed() {
    // TODO: [FIREBASE] Navigator.push vers RegisterScreen
  }

  // -------------------------------------------------------------------------
  // Build
  // -------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final screenHeight = MediaQuery.of(context).size.height;
    final screenWidth = MediaQuery.of(context).size.width;
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: _MaisonTokens.charcoal,
      resizeToAvoidBottomInset: true,
      body: Stack(
        children: [
          // --- Fond anime : gradient radial tournant ---
          _AnimatedBackground(controller: _bgAnimController),

          // --- Vignette cinematique ---
          _CinematicVignette(screenHeight: screenHeight),

          // --- Contenu ---
          SafeArea(
            child: FadeTransition(
              opacity: _fadeAnim,
              child: SingleChildScrollView(
                physics: const ClampingScrollPhysics(),
                padding: EdgeInsets.only(
                  left: _MaisonTokens.spacingL,
                  right: _MaisonTokens.spacingL,
                  bottom: bottomPadding + _MaisonTokens.spacingL,
                ),
                child: ConstrainedBox(
                  constraints: BoxConstraints(
                    minHeight: screenHeight -
                        MediaQuery.of(context).padding.top -
                        MediaQuery.of(context).padding.bottom,
                  ),
                  child: Column(
                    children: [
                      SizedBox(height: screenHeight * 0.08),

                      // --- Logo + sous-titre ---
                      SlideTransition(
                        position: _slideLogo,
                        child: _LogoBlock(screenWidth: screenWidth),
                      ),

                      SizedBox(height: screenHeight * 0.06),

                      // --- Formulaire ---
                      SlideTransition(
                        position: _slideForm,
                        child: _buildForm(),
                      ),

                      const SizedBox(height: _MaisonTokens.spacingXl),

                      // --- Bouton connexion ---
                      SlideTransition(
                        position: _slideForm,
                        child: _buildLoginButton(),
                      ),

                      const SizedBox(height: _MaisonTokens.spacingL),

                      // --- Separateur ---
                      SlideTransition(
                        position: _slideBottom,
                        child: _buildDivider(),
                      ),

                      const SizedBox(height: _MaisonTokens.spacingL),

                      // --- Google Sign-In ---
                      SlideTransition(
                        position: _slideBottom,
                        child: _buildGoogleButton(),
                      ),

                      const SizedBox(height: _MaisonTokens.spacingXxl),

                      // --- Creer un compte ---
                      SlideTransition(
                        position: _slideBottom,
                        child: _buildCreateAccount(),
                      ),

                      const SizedBox(height: _MaisonTokens.spacingM),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Sous-widgets
  // -------------------------------------------------------------------------

  Widget _buildForm() {
    return Column(
      children: [
        // --- Email ---
        _MaisonTextField(
          controller: _emailController,
          focusNode: _emailFocus,
          label: 'Adresse courriel',
          hint: 'vous@exemple.com',
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          prefixIcon: Icons.mail_outline_rounded,
          onSubmitted: (_) =>
              FocusScope.of(context).requestFocus(_passwordFocus),
        ),

        const SizedBox(height: _MaisonTokens.spacingM),

        // --- Mot de passe ---
        _MaisonTextField(
          controller: _passwordController,
          focusNode: _passwordFocus,
          label: 'Mot de passe',
          hint: '',
          obscureText: _obscurePassword,
          textInputAction: TextInputAction.done,
          prefixIcon: Icons.lock_outline_rounded,
          suffixIcon: IconButton(
            icon: Icon(
              _obscurePassword
                  ? Icons.visibility_off_outlined
                  : Icons.visibility_outlined,
              color: _MaisonTokens.offWhiteSecondary,
              size: 20,
            ),
            splashRadius: 20,
            onPressed: () =>
                setState(() => _obscurePassword = !_obscurePassword),
          ),
          onSubmitted: (_) => _onLoginPressed(),
        ),

        const SizedBox(height: _MaisonTokens.spacingS),

        // --- Mot de passe oublie ---
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: _onForgotPasswordPressed,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(
                horizontal: _MaisonTokens.spacingS,
                vertical: _MaisonTokens.spacingXs,
              ),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(
              'Mot de passe oublie ?',
              style: GoogleFonts.inter(
                fontSize: 13,
                color: _MaisonTokens.offWhiteSecondary,
                letterSpacing: 0.2,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildLoginButton() {
    return AnimatedBuilder(
      animation: _buttonPulse,
      builder: (context, child) {
        return Transform.scale(
          scale: _isLoading ? 1.0 : _buttonPulse.value,
          child: child,
        );
      },
      child: SizedBox(
        width: double.infinity,
        height: 56,
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(_MaisonTokens.radiusMd),
            gradient: const LinearGradient(
              colors: [
                _MaisonTokens.goldChampagne,
                Color(0xFFBF9B30),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              BoxShadow(
                color: _MaisonTokens.goldChampagne.withValues(alpha: 0.3),
                blurRadius: 20,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: ElevatedButton(
            onPressed: _isLoading ? null : _onLoginPressed,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.transparent,
              shadowColor: Colors.transparent,
              foregroundColor: _MaisonTokens.charcoal,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(_MaisonTokens.radiusMd),
              ),
              padding: EdgeInsets.zero,
            ),
            child: _isLoading
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: _MaisonTokens.charcoal,
                    ),
                  )
                : Text(
                    'Se connecter',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.0,
                      color: _MaisonTokens.charcoal,
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildDivider() {
    return Row(
      children: [
        const Expanded(
          child: Divider(
            color: _MaisonTokens.divider,
            thickness: 0.5,
          ),
        ),
        Padding(
          padding:
              const EdgeInsets.symmetric(horizontal: _MaisonTokens.spacingM),
          child: Text(
            'ou',
            style: GoogleFonts.inter(
              fontSize: 13,
              color: _MaisonTokens.offWhiteSecondary,
              letterSpacing: 0.5,
            ),
          ),
        ),
        const Expanded(
          child: Divider(
            color: _MaisonTokens.divider,
            thickness: 0.5,
          ),
        ),
      ],
    );
  }

  Widget _buildGoogleButton() {
    return SizedBox(
      width: double.infinity,
      height: 54,
      child: OutlinedButton.icon(
        onPressed: _onGoogleSignInPressed,
        style: OutlinedButton.styleFrom(
          side: const BorderSide(
            color: _MaisonTokens.inputBorder,
            width: 1,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(_MaisonTokens.radiusMd),
          ),
          backgroundColor: _MaisonTokens.inputFill,
          foregroundColor: _MaisonTokens.offWhite,
          padding: const EdgeInsets.symmetric(
            horizontal: _MaisonTokens.spacingM,
          ),
        ),
        icon: Text(
          'G',
          style: GoogleFonts.inter(
            fontSize: 20,
            fontWeight: FontWeight.w700,
            color: _MaisonTokens.offWhite,
          ),
        ),
        label: Text(
          'Continuer avec Google',
          style: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.3,
            color: _MaisonTokens.offWhite,
          ),
        ),
      ),
    );
  }

  Widget _buildCreateAccount() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'Pas encore membre ?',
          style: GoogleFonts.inter(
            fontSize: 14,
            color: _MaisonTokens.offWhiteSecondary,
          ),
        ),
        TextButton(
          onPressed: _onCreateAccountPressed,
          style: TextButton.styleFrom(
            padding: const EdgeInsets.symmetric(
              horizontal: _MaisonTokens.spacingS,
            ),
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: Text(
            'Creer un compte',
            style: GoogleFonts.inter(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: _MaisonTokens.goldChampagne,
              letterSpacing: 0.3,
            ),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Bloc logo "MAISON"
// ---------------------------------------------------------------------------

class _LogoBlock extends StatelessWidget {
  final double screenWidth;

  const _LogoBlock({required this.screenWidth});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Ligne decorative superieure
        _GoldLine(width: screenWidth * 0.12),

        const SizedBox(height: _MaisonTokens.spacingM),

        // Nom de marque
        Text(
          'MAISON',
          style: GoogleFonts.playfairDisplay(
            fontSize: 44,
            fontWeight: FontWeight.w700,
            letterSpacing: 12,
            color: _MaisonTokens.offWhite,
            height: 1.1,
          ),
        ),

        const SizedBox(height: _MaisonTokens.spacingS),

        // Sous-titre
        Text(
          'Table de fidelite',
          style: GoogleFonts.cormorantGaramond(
            fontSize: 18,
            fontWeight: FontWeight.w400,
            letterSpacing: 4,
            color: _MaisonTokens.goldChampagne,
            fontStyle: FontStyle.italic,
          ),
        ),

        const SizedBox(height: _MaisonTokens.spacingM),

        // Ligne decorative inferieure
        _GoldLine(width: screenWidth * 0.12),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Ligne doree decorative
// ---------------------------------------------------------------------------

class _GoldLine extends StatelessWidget {
  final double width;

  const _GoldLine({required this.width});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: 1.5,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            _MaisonTokens.goldChampagne.withValues(alpha: 0.0),
            _MaisonTokens.goldChampagne,
            _MaisonTokens.goldChampagne.withValues(alpha: 0.0),
          ],
        ),
        borderRadius: BorderRadius.circular(1),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Champ de saisie custom "MAISON"
// ---------------------------------------------------------------------------

class _MaisonTextField extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final String label;
  final String hint;
  final bool obscureText;
  final TextInputType keyboardType;
  final TextInputAction textInputAction;
  final IconData prefixIcon;
  final Widget? suffixIcon;
  final ValueChanged<String>? onSubmitted;

  const _MaisonTextField({
    required this.controller,
    required this.focusNode,
    required this.label,
    required this.hint,
    this.obscureText = false,
    this.keyboardType = TextInputType.text,
    this.textInputAction = TextInputAction.done,
    required this.prefixIcon,
    this.suffixIcon,
    this.onSubmitted,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Label au-dessus du champ
        Padding(
          padding: const EdgeInsets.only(
            left: _MaisonTokens.spacingXs,
            bottom: _MaisonTokens.spacingS,
          ),
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: _MaisonTokens.offWhiteSecondary,
              letterSpacing: 0.5,
            ),
          ),
        ),

        // Champ
        TextField(
          controller: controller,
          focusNode: focusNode,
          obscureText: obscureText,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          onSubmitted: onSubmitted,
          cursorColor: _MaisonTokens.goldChampagne,
          cursorWidth: 1.5,
          style: GoogleFonts.inter(
            fontSize: 15,
            color: _MaisonTokens.offWhite,
            letterSpacing: 0.3,
          ),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.inter(
              fontSize: 15,
              color: _MaisonTokens.offWhiteSecondary.withValues(alpha: 0.4),
            ),
            filled: true,
            fillColor: _MaisonTokens.inputFill,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: _MaisonTokens.spacingM,
              vertical: _MaisonTokens.spacingM,
            ),
            prefixIcon: Padding(
              padding: const EdgeInsets.only(
                left: _MaisonTokens.spacingM,
                right: _MaisonTokens.spacingS,
              ),
              child: Icon(
                prefixIcon,
                size: 20,
                color: _MaisonTokens.offWhiteSecondary,
              ),
            ),
            prefixIconConstraints: const BoxConstraints(
              minWidth: 0,
              minHeight: 0,
            ),
            suffixIcon: suffixIcon,
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(_MaisonTokens.radiusMd),
              borderSide: const BorderSide(
                color: _MaisonTokens.inputBorder,
                width: 1,
              ),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(_MaisonTokens.radiusMd),
              borderSide: const BorderSide(
                color: _MaisonTokens.inputBorderFocused,
                width: 1.5,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(_MaisonTokens.radiusMd),
              borderSide: const BorderSide(
                color: _MaisonTokens.error,
                width: 1,
              ),
            ),
            focusedErrorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(_MaisonTokens.radiusMd),
              borderSide: const BorderSide(
                color: _MaisonTokens.error,
                width: 1.5,
              ),
            ),
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Fond anime — gradient radial qui tourne lentement
// ---------------------------------------------------------------------------

class _AnimatedBackground extends StatelessWidget {
  final AnimationController controller;

  const _AnimatedBackground({required this.controller});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, child) {
        return CustomPaint(
          painter: _BackgroundPainter(
            rotation: controller.value * 2 * math.pi,
          ),
          size: MediaQuery.of(context).size,
        );
      },
    );
  }
}

class _BackgroundPainter extends CustomPainter {
  final double rotation;

  _BackgroundPainter({required this.rotation});

  @override
  void paint(Canvas canvas, Size size) {
    // Fond solide charcoal
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = _MaisonTokens.charcoal,
    );

    // Halo dore subtil en haut a droite — tourne lentement
    final centerX = size.width * 0.75 + math.cos(rotation) * size.width * 0.05;
    final centerY = size.height * 0.15 + math.sin(rotation) * size.height * 0.03;

    final glowPaint = Paint()
      ..shader = RadialGradient(
        colors: [
          _MaisonTokens.goldChampagne.withValues(alpha: 0.07),
          _MaisonTokens.goldChampagne.withValues(alpha: 0.02),
          Colors.transparent,
        ],
        stops: const [0.0, 0.4, 1.0],
      ).createShader(
        Rect.fromCircle(
          center: Offset(centerX, centerY),
          radius: size.width * 0.6,
        ),
      );
    canvas.drawCircle(
      Offset(centerX, centerY),
      size.width * 0.6,
      glowPaint,
    );

    // Second halo plus petit en bas a gauche
    final cx2 = size.width * 0.2 + math.sin(rotation * 0.7) * size.width * 0.04;
    final cy2 =
        size.height * 0.85 + math.cos(rotation * 0.7) * size.height * 0.02;

    final glow2 = Paint()
      ..shader = RadialGradient(
        colors: [
          _MaisonTokens.goldChampagne.withValues(alpha: 0.04),
          Colors.transparent,
        ],
        stops: const [0.0, 1.0],
      ).createShader(
        Rect.fromCircle(
          center: Offset(cx2, cy2),
          radius: size.width * 0.4,
        ),
      );
    canvas.drawCircle(Offset(cx2, cy2), size.width * 0.4, glow2);
  }

  @override
  bool shouldRepaint(covariant _BackgroundPainter oldDelegate) =>
      oldDelegate.rotation != rotation;
}

// ---------------------------------------------------------------------------
// Vignette cinematique — assombrissement sur les bords
// ---------------------------------------------------------------------------

class _CinematicVignette extends StatelessWidget {
  final double screenHeight;

  const _CinematicVignette({required this.screenHeight});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: SizedBox.expand(
        child: DecoratedBox(
          decoration: BoxDecoration(
            gradient: RadialGradient(
              center: const Alignment(0, -0.3),
              radius: 1.2,
              colors: [
                Colors.transparent,
                _MaisonTokens.charcoal.withValues(alpha: 0.6),
                _MaisonTokens.charcoal.withValues(alpha: 0.95),
              ],
              stops: const [0.3, 0.7, 1.0],
            ),
          ),
        ),
      ),
    );
  }
}
