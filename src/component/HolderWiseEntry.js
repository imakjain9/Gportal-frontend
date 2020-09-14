import React from 'react';
import { connect } from 'react-redux';
import { Navbar, FormControl, Button } from 'react-bootstrap'
import NavigationBar from './NavigationBar'
import * as Icon from 'react-bootstrap-icons';
import * as companyMasterService from "../service/CompanyMasterService";
import * as accountHolderMasterService from "../service/AccountHolderMasterService";
import { history } from './../helpers/history';

import * as actions from '../state/actions';

class HolderWiseEntry extends React.Component {
    constructor(props) {
        super(props);

        var today = new Date(),
            date = (today.getDate() < 10 ? ('0' + today.getDate()) : today.getDate()) + '/' + (today.getMonth() < 10 ? ('0' + today.getMonth()) : today.getMonth) + '/' + today.getFullYear();

        this.state = {
            searchTerm: '',
            searchResult: [],
            activeAccount: { id: '', name: '', userName: '', password: '', remarks: '' },
            activeAccountHolderTransaction: {},
            date: date,
            obalanceSum: 0,
            balanceSum: 0
        };

        this.handleSearchChange = this.handleSearchChange.bind(this);
        this.clearTransactions = this.clearTransactions.bind(this);
    }

    componentDidMount() {
        this.getAccountHolderMasterList();
    }

    handleKeyDown(e, index) {
        if (e.key === 'Enter') {
            this.saveAccountHolderTransaction(index);
        }
    }

    saveAccountHolderTransaction(index) {
        const transaction = this.state.activeAccountHolderTransaction.transactions[index];
        const result = transaction.balance.match(/^[+-]?\d+(\.\d+)?$/);
        if(result==null){
            alert("Invalid entry")
            return;
        }
        const { dispatch } = this.props;
        dispatch(actions.request());
        accountHolderMasterService.saveAccountHolderTransaction(transaction)
            .then(response => {
                console.log(response)
            })
            .catch(error => {
                alert("Failed to update Group Holder.\nError:" + error);
            })
    }

    getAccountHolderMasterList() {
        const { dispatch } = this.props;
        dispatch(actions.request());
        accountHolderMasterService.getAll()
            .then(response => {
                console.log(response)
                dispatch(actions.getAccountHolderMasterListSuccess(response.data));
                const { accountHolderMasterList } = this.props;
                if (accountHolderMasterList != []) {
                    this.setState({ searchResult: accountHolderMasterList, isSubmitted: false, activeAccount: accountHolderMasterList[0] })
                    this.getAccountHolderTransactions(accountHolderMasterList[0]);
                }
            }).catch(error => {
                alert("Failed to load account Holder List.\nError:" + error)
            })
    }

    getAccountHolderTransactions(accountHolder) {
        const { dispatch } = this.props;
        dispatch(actions.request());
        accountHolderMasterService.getAccountHolderTransactions(accountHolder.id)
            .then(response => {

                console.log(response);
                let activeAccountHolderTransaction = response.data;
                let obalanceSum = 0;
                let balanceSum = 0;
                const transactions = activeAccountHolderTransaction.transactions;
                if (transactions != null) {
                    for (let tran of transactions) {
                        obalanceSum = obalanceSum + tran.obalance;
                        balanceSum = balanceSum + tran.balance;
                    }
                }

                this.setState({ activeAccountHolderTransaction: response.data, obalanceSum: obalanceSum, balanceSum: balanceSum, activeAccount: accountHolder });
            }).catch(error => {
                alert("Failed to load account Holder transactions.\nError:" + error)
            })
    }

    handleChange(e, index) {
        const { name, value } = e.target;
        const activeAccountHolderTransaction = { ...this.state.activeAccountHolderTransaction };
        const transactions = activeAccountHolderTransaction.transactions;
        transactions[index].balance = value;
        const { rate, base, balance } = transactions[index];
        let pointPnl = (balance - base)
        let profitLoss = (pointPnl * rate)
        transactions[index].pointPnl = pointPnl
        transactions[index].profitLoss = profitLoss
        let balanceSum = 0;
        for (let tran of transactions) {
            balanceSum = balanceSum + Number.parseFloat(tran.balance);
        }

        this.setState({ activeAccountHolderTransaction: activeAccountHolderTransaction, balanceSum: balanceSum });
    }

    handleSearchChange(e) {
        const { name, value } = e.target;
        this.setState({ [name]: value });
        let result = this.props.CompanyMasterList;
        result = result.filter(item => item.name.toLowerCase().includes(value.toLowerCase()))
        this.setState({ searchResult: result })
    }

    clearTransactions(accountHolder) {
        const { dispatch } = this.props;
        dispatch(actions.request());
        accountHolderMasterService.clearAccountHolderTransations(accountHolder.id)
            .then(response => {
                console.log(response);
                this.getAccountHolderTransactions(accountHolder.id)
            })
    }

    render() {
        const { loggingIn } = this.props;
        const { searchTerm, activeAccount, isDisabled, isSubmitted, date, activeAccountHolderTransaction, obalanceSum, balanceSum } = this.state;
        const { name, baseRate, remarks } = activeAccount;
        const { lastSaved } = activeAccountHolderTransaction;
        const items = []
        const elements = this.state.searchResult;
        for (const [index, value] of elements.entries()) {
            items.push(<li className={activeAccount.name === value.name ? "active item list-group-item" : "item list-group-item"}
                onClick={() => this.getAccountHolderTransactions(value)} key={index}>{value.name}</li>)
        }

        const transactionRows = []
        const transactions = activeAccountHolderTransaction.transactions || [];
        let srNum = 1;
        for (const [index, value] of transactions.entries()) {
            transactionRows.push(
                <tr key={index}>
                    <td>{srNum}</td>
                    <td>{value.accountName}</td>
                    <td>{value.holderName}</td>
                    <td>{value.obalance}</td>
                    <td>{value.rate}</td>
                    <td>{value.base}</td>
                    <td><input style={{ 'width': '80%' }} type="text" value={value.balance} name="balance"
                        onChange={(e) => this.handleChange(e, index)}
                        onKeyDown={(e) => this.handleKeyDown(e, index)} /></td>
                    <td style={{ 'background-color': value.pointPnl >= 0 ? '#b6daad' : '#f1a9b4' }}>
                        {value.pointPnl.toLocaleString('en-IN', {
                            maximumFractionDigits: 2,
                            style: 'currency',
                            currency: 'INR'
                        })}
                    </td>
                    <td style={{ 'background-color': value.profitLoss >= 0 ? '#b6daad' : '#f1a9b4' }}>
                        {value.profitLoss.toLocaleString('en-IN', {
                            maximumFractionDigits: 2,
                            style: 'currency',
                            currency: 'INR'
                        })}
                    </td>
                </tr>
            )
            srNum++;
        }

        return (
            <div>
                <NavigationBar />
                <div className="outer-panel">
                    <div className="row" >
                        <div className="outer-search-panel col-sm-3">
                            <div className="inner-search-panel">
                                <div>
                                    <Navbar className="inner-nav" bg="dark" variant="dark">
                                        <div className="col-12">
                                            <FormControl type="text" value={searchTerm} placeholder="Search" name="searchTerm" onChange={this.handleSearchChange} />
                                        </div>
                                    </Navbar>
                                </div>
                                <div className="inner-search-box">
                                    <ul className="list-group">
                                        <li className="heading list-group-item disabled">Company Name</li>
                                        {items}
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className="outer-work-panel col-sm-9">
                            <div className="inner-work-panel">
                                <div>
                                    <Navbar bg="dark" variant="dark">
                                        <div className="btn-component">
                                            <Button variant="success"><Icon.FileEarmark />Save</Button>
                                        </div>
                                        <div className="btn-component">
                                            <Button variant="danger"
                                                onClick={() => this.clearTransactions(this.state.activeAccount)}><Icon.Trash />Clear</Button>
                                        </div>
                                        <div className="btn-component">
                                            <Button variant="primary" onClick={() => window.print()}><Icon.Printer />Print</Button>
                                        </div>
                                        {/* <div className="btn-component">
                                            <ReactToPrint
                                                trigger={() => {
                                                    return (
                                                        <div>
                                                            <Button variant="primary"><Icon.Printer />Print</Button>
                                                        </div>
                                                    )
                                                }}
                                                content={() => this.myRef}
                                            />
                                        </div> */}

                                        <div className="btn-component">
                                            <Button variant="warning" onClick={() => history.push('/')}><Icon.X />Close</Button>
                                        </div>
                                    </Navbar>
                                </div>
                                <div className="inner-work-box row">
                                    <div className="work-section col-12">
                                        <div className="row">
                                            <div className="col-5" style={{ 'padding': '0px' }}>
                                                <label className="lbl-heading" htmlFor="name">Holder : {name}</label>
                                                {/* <input type="text" disabled={isDisabled} value={name} className="form-control" name="name" onChange={this.handleChange} />
                                                {isSubmitted && !name &&
                                                    <div className="help-block">Name is required</div>
                                                } */}
                                            </div>
                                            <div className="col-2" style={{ 'padding': '0px' }}></div>
                                            <div className="col-2" style={{ 'padding': '0px' }}></div>
                                            <div className="col-3" style={{ 'padding': '0px' }}>
                                                <label className="lbl-heading" htmlFor="userName">Date : {date}</label>
                                                {/* <input type="text" disabled={isDisabled} value={baseRate} className="form-control" name="baseRate" onChange={this.handleChange} />
                                                {isSubmitted && !baseRate &&
                                                    <div className="help-block">Base rate is required</div>
                                                } */}
                                            </div>
                                        </div>
                                        <div className="table-wrapper table-responsive">
                                            <table className="table table-borderless">
                                                <thead>
                                                    <tr>
                                                        <th scope="col" style={{ 'width': '5%' }}>Sr.</th>
                                                        <th scope="col" style={{ 'width': '10%' }}>Account</th>
                                                        <th scope="col" style={{ 'width': '10%' }}>Holder</th>
                                                        <th scope="col" style={{ 'width': '10%' }}>O.Balance</th>
                                                        <th scope="col" style={{ 'width': '5%' }}>Rate</th>
                                                        <th scope="col" style={{ 'width': '10%' }}>Base</th>
                                                        <th scope="col" style={{ 'width': '10%' }}>Balance</th>
                                                        <th scope="col" style={{ 'width': '10%' }}>Point P/L</th>
                                                        <th scope="col" style={{ 'width': '10%' }}>Profit/Loss (₹)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {transactionRows}
                                                </tbody>
                                                <tfoot>
                                                    <tr>
                                                        <th scope="col">Total</th>
                                                        <th scope="col"></th>
                                                        <th scope="col"></th>
                                                        <th scope="col">{obalanceSum}</th>
                                                        <th scope="col"></th>
                                                        <th scope="col"></th>
                                                        <th scope="col">{balanceSum}</th>
                                                        <th scope="col"></th>
                                                        <th scope="col"></th>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                            {/* <label className="lbl-form" htmlFor="remakrs">Remarks :</label>
                                            <input type="text" disabled={isDisabled} value={remarks} className="form-control" name="remarks" onChange={this.handleChange} />
                                            {isSubmitted && !remarks &&
                                                <div className="help-block">Remarks are required</div>
                                            } */}
                                        </div>
                                        <div>{lastSaved}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

function mapStateToProps(state) {
    return {
        accountHolderMasterList: state.accountHolderMasterReducer.accountHolderMasterList,
    }
}

export default connect(mapStateToProps)(HolderWiseEntry);