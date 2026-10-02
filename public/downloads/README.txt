Dossier de distribution des APK ASCOS Natation.

Pour mettre à disposition une nouvelle version :
1. Compilez l'APK en exécutant dans le dossier ascos_mobile :
   flutter build apk --release

2. Copiez le fichier généré :
   ascos_mobile/build/app/outputs/flutter-apk/app-release.apk
   vers ce dossier sous le nom :
   ascos-backend/public/downloads/ascos.apk

3. L'application mobile détectera automatiquement la nouvelle version et proposera l'installation en 1 clic !
