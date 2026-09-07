import { Component, type ReactNode } from 'react'
import { useAlbumState } from './albumState'

/** A failed optional model must never tear down the shared portfolio canvas. */
export default class AlbumAssetBoundary extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error) {
    console.warn(`Album asset unavailable: ${this.props.name}`, error)
    useAlbumState.setState(state => ({ assetErrors: [...new Set([...state.assetErrors, this.props.name])] }))
  }
  render() { return this.state.failed ? null : this.props.children }
}
