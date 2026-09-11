'use client'
import { Component } from 'react'
import { report } from '../engine/report'

// ─── גבול שגיאה מקומי ───
// מסך אחד שנשבר לא צריך להפיל את כל המשחק באמצע הרחוב. מה שנופל כאן
// נעצר כאן, נשלח אלינו, והילד מקבל כפתור להמשיך — לא מסך לבן.

export class Guard extends Component {
  constructor(props) { super(props); this.state = { err: null } }
  static getDerivedStateFromError(err) { return { err } }
  componentDidCatch(err, info) {
    report(err, { where: this.props.where || 'guard', info: info?.componentStack })
  }
  render() {
    if (!this.state.err) return this.props.children
    const F = this.props.fallback
    return typeof F === 'function' ? F(() => this.setState({ err: null })) : (F ?? null)
  }
}
