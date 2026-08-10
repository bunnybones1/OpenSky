export class TimeMarkReport {
  constructor(
    public label: string,
    public type: 'start' | 'end',
    public time: number
  ) {
    console.log(this.type, this.label, this.time)
  }
}
