// On-brand SVG mascot — mirrors the web's <GuacMascot/>.
//
// 🔄 2026-06-05 (user-approved): the brand mascot was REPLACED with the
// NEW avocado character (face-up, white eyes, amber belly seed) to match
// the web. The 3 mood SVGs in assets/mascot/ (happy / rich / relaxing)
// were regenerated to the new design — rich = shades + cash, relaxing =
// shades + drink, both with the longer arms. viewBox is now 220×290.
//
// Animating the whole mascot via AnimatedMascot (scale/rotate/translate/
// confetti) is still the wrapper layer and unchanged.
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

enum MascotMood { happy, rich, relaxing }

class GuacMascot extends StatelessWidget {
  final MascotMood mood;
  final double size;
  const GuacMascot({super.key, this.mood = MascotMood.happy, this.size = 120});

  String get _asset {
    switch (mood) {
      case MascotMood.rich: return 'assets/mascot/rich.svg';
      case MascotMood.relaxing: return 'assets/mascot/relaxing.svg';
      case MascotMood.happy: return 'assets/mascot/happy.svg';
    }
  }

  @override
  Widget build(BuildContext context) {
    return SvgPicture.asset(
      _asset,
      width: size,
      height: size * (290 / 220),
      semanticsLabel: 'GetGuac avocado mascot',
    );
  }
}
