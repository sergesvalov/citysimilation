@Library('mylib@main') _

pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Build Web Assets') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Sync Capacitor') {
            steps {
                sh 'npx cap sync android'
            }
        }

        stage('Build Android APK') {
            steps {
                dir('android') {
                    // Make the Gradle wrapper executable just in case
                    sh 'chmod +x gradlew'
                    sh './gradlew assembleDebug'
                }
            }
        }
    }

    post {
        success {
            archiveArtifacts artifacts: 'android/app/build/outputs/apk/debug/app-debug.apk', allowEmptyArchive: true
        }
    }
}
