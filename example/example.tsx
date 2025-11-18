interface Props {
    title: string;
    count?: number;
}
/**
* @description Press Your { Function Component } Description
* @param {Props} props
* @returns {void}
*/
function Component(props: Props) {
    return <div>{props.title}</div>;
}
/**
* @description Press Your { Function ArrowComponent } Description
* @param {Props} props
* @returns {JSX.Element}
*/
const ArrowComponent = (props: Props): JSX.Element => {
    return <div>{props.title}</div>;
};
export default Component;
