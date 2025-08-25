#!/usr/bin/env zx

import { Gitlab } from '@gitbeaker/rest'
import semver from 'semver'
import { readFileSync, writeFileSync } from 'fs'
import { basename, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import dependencies from '../data/dependencies.json' assert { type: 'json' }

const RELEASE_CHANNEL = process.env.GITHUB_REF_NAME === 'next' ? 'next' : 'path'
const GOIMAPNOTIFY_GITLAB_PROJECT_ID = 3978569
const FETCHMAIL_BEST_RELEASE_URL = 'https://sourceforge.net/projects/fetchmail/best_release.json'
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const README_PATH = resolve(__dirname, '../../README.md')
const DEPENDENCIES_PATH = resolve(__dirname, '../data/dependencies.json')
let needToRelease = false

function getLatestPatchInMinor(versions: string[], currentVersion: string) {
    const range = `~${currentVersion}`
    return versions.reduce((latest, v) => {
        if (!semver.satisfies(v, range) || semver.prerelease(v)) {
            return latest
        }

        return !latest || semver.gt(v, latest) ? v : latest
    }, currentVersion)
}

export function getLatestAbove(versions: string[], latestPatchVersion: string) {
    return versions
        .filter(v => semver.gt(v, latestPatchVersion))
        .reduce((latest: string | null, v) =>
            latest && semver.gte(latest, v) ? latest : v,
            null
        )
}

/** GoIMAPNotify */ {
    const api = new Gitlab({})
    const tags = await api.Tags.all(GOIMAPNOTIFY_GITLAB_PROJECT_ID)
    const currentVersion = semver.clean(dependencies.goimapnotify.version) || '0.0.0'
    const versions = tags
        .map(item => semver.valid(semver.clean(item.name)))
        .filter(item => typeof item === 'string')

    const latestPathVersion = getLatestPatchInMinor(versions, currentVersion)
    const latestVersion = getLatestAbove(versions, latestPathVersion) || latestPathVersion

    const version = RELEASE_CHANNEL === 'next' ? latestVersion : latestPathVersion
    const hasUpdate = semver.gt(version, currentVersion)
    if (hasUpdate) {
        needToRelease = true
        dependencies.goimapnotify.version = version
    }

    console.log(`GoIMAPNotify: current=v${currentVersion}, latest=v${version}, channel=${RELEASE_CHANNEL} hasUpdate=${hasUpdate}`)
}

/** fetchmail */ {
    const response = await fetch(FETCHMAIL_BEST_RELEASE_URL)
    const data = await response.json() as FetchMailRelease
    const currentVersion = semver.clean(dependencies.fetchmail.version) || '0.0.0'
    const versions = [currentVersion, semver.coerce(basename(data.release.filename))?.version]
        .map(item => semver.valid(semver.clean(item || '0.0.0')))
        .filter(item => typeof item === 'string')
    const latestPathVersion = getLatestPatchInMinor(versions, currentVersion)
    const latestVersion = getLatestAbove(versions, latestPathVersion) || latestPathVersion

    const version = RELEASE_CHANNEL === 'next' ? latestVersion : latestPathVersion
    const hasUpdate = semver.gt(version, currentVersion)
    if (hasUpdate) {
        needToRelease = true
        dependencies.fetchmail.version = version
        dependencies.fetchmail.download = data.release.url
    }

    console.log(`FetchMail: current=v${currentVersion}, latest=v${version}, channel=${RELEASE_CHANNEL} hasUpdate=${hasUpdate}`)
}

/** Dependencies */ {
    if (needToRelease) {
        // Update project version
        if (RELEASE_CHANNEL === 'next') {
            dependencies.project.version = 'next'
        } else {
            const currentVersion = semver.clean(dependencies.project.version) || '0.0.0'
            dependencies.project.version = semver.inc(currentVersion, 'patch') || currentVersion
        }

        writeFileSync(DEPENDENCIES_PATH, JSON.stringify(dependencies, null, 2).trim() + "\n")
        console.log('Updated dependencies.json')
    }
}

/** Readme */ {
    const origContent = readFileSync(README_PATH, 'utf-8')
    let content = origContent
    const versionsBlock = `<!-- VERSIONS -->\n![Project](https://img.shields.io/badge/Project-v${dependencies.project.version}-blue) ![GoIMAPNotify](https://img.shields.io/badge/GoIMAPNotify-v${dependencies.goimapnotify.version}-green) ![FetchMail](https://img.shields.io/badge/FetchMail-v${dependencies.fetchmail.version}-green)\n<!-- /VERSIONS -->`
    content = content.replace(/<!-- VERSIONS -->([\s\S]*?)<!-- \/VERSIONS -->/g, versionsBlock)
    if (content !== origContent) {
        writeFileSync(README_PATH, content)
        console.log('Updated README.md')
    }
}

interface FetchMailRelease {
    release: {
        filename: string
        url: string
    }
}
