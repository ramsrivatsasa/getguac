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
