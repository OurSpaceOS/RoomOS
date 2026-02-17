<?php

class UpdateController
{
    private $pdo;

    // Current app version - update this when deploying a new build
    const CURRENT_APP_VERSION = '1.0.0';

    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Check for app updates
     * Compares the current app version against the latest active version in the DB
     * Returns update info if a newer version is available
     */
    public function getLatestUpdate()
    {
        try {
            // Get the latest active update from the database
            $stmt = $this->pdo->prepare("
                SELECT version, title, description, release_notes, download_url, release_date, force_update
                FROM app_updates 
                WHERE is_active = 1
                ORDER BY created_at DESC
                LIMIT 1
            ");
            $stmt->execute();
            $update = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$update) {
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'has_update' => false,
                    'current_version' => self::CURRENT_APP_VERSION,
                ]);
                return;
            }

            // Compare versions
            $hasUpdate = version_compare($update['version'], self::CURRENT_APP_VERSION, '>');

            // Parse release notes from JSON
            $releaseNotes = json_decode($update['release_notes'], true) ?? [];

            $response = [
                'success' => true,
                'has_update' => $hasUpdate,
                'current_version' => self::CURRENT_APP_VERSION,
                'latest_version' => $update['version'],
                'title' => $update['title'],
                'description' => $update['description'],
                'release_notes' => $releaseNotes,
                'download_url' => $update['download_url'],
                'release_date' => $update['release_date'],
                'force_update' => (bool) $update['force_update'],
            ];

            http_response_code(200);
            echo json_encode($response);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Failed to check for updates: ' . $e->getMessage()
            ]);
        }
    }
}
