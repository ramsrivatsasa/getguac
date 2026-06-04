// ╔══════════════════════════════════════════════════════════════════╗
// ║  🔒 DO NOT CHANGE — the GetGuac brand mascot SVG (mobile).       ║
// ║  Mirror of web/src/components/GuacMascot.jsx. The avocado        ║
// ║  character + the 3 SVG asset files (happy / rich / relaxing)     ║
// ║  are LOCKED by the user (2026-06-04). No asset swap, no redraw,  ║
// ║  no Lottie replacement, no separable-parts re-author. ASK FIRST. ║
// ║                                                                  ║
// ║  Animating the whole mascot via AnimatedMascot (scale/rotate/    ║
// ║  translate/confetti) is still OK — that's the wrapper.           ║
// ╚══════════════════════════════════════════════════════════════════╝
//
// On-brand SVG mascot — mirrors the web's <GuacMascot/>.
// Three variants for now: happy (default), rich (Steals), relaxing (empty states).
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
      height: size * (280 / 220),
      semanticsLabel: 'GetGuac avocado mascot',
    );
  }
}
