package mailchimp

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/pkg/errors"

	"github.com/horizon-games/OpenSky/api/config"
)

type Mailchimp struct {
	Config     config.Mailchimp
	apiURL     string
	httpClient *http.Client
}

func NewMailchimp(cfg config.Mailchimp) (*Mailchimp, error) {
	parts := strings.Split(cfg.APIKey, "-")
	if len(parts) < 2 {
		return nil, errors.Errorf("mailchimp: invalid api key, could not parse the dc")
	}
	dc := parts[1]

	return &Mailchimp{
		Config:     cfg,
		apiURL:     fmt.Sprintf("https://%s.api.mailchimp.com/3.0", dc),
		httpClient: http.DefaultClient,
	}, nil
}

func (m *Mailchimp) AddEarlyAccessContact(emailAddress string) (bool, map[string]interface{}, error) {
	path := fmt.Sprintf("/lists/%s/members/", m.Config.EarlyAccessList)

	addContractReq := AddContactRequest{
		EmailAddress: emailAddress,

		// see https://developer.mailchimp.com/documentation/mailchimp/guides/manage-subscribers-with-the-mailchimp-api/
		Status: "pending",
	}

	out := map[string]interface{}{}
	status, err := m.doJSONRequest("POST", path, addContractReq, &out)
	if err != nil {
		return false, out, err
	}

	// For non-200 status responses, if the member is already in the list, we just report success
	if status != 200 {
		s := out["detail"].(string)
		if strings.Contains(s, "is already a list member.") {
			return true, out, nil
		} else {
			return false, out, errors.Errorf("mailchimp: request error")
		}
	}

	return true, out, nil
}

func (m *Mailchimp) APIURL(path string) (string, error) {
	if m.apiURL == "" {
		return "", errors.Errorf("mailchimp: apiURL is empty")
	}
	if path[0:1] != "/" {
		return "", errors.Errorf("mailchimp: api url path must start with /")
	}
	return fmt.Sprintf("%s%s", m.apiURL, path), nil
}

func (m *Mailchimp) doJSONRequest(method, path string, in, out interface{}) (int, error) {
	url, err := m.APIURL(path)
	if err != nil {
		return 0, err
	}

	reqBody, err := json.Marshal(in)
	if err != nil {
		return 0, err
	}

	req, err := http.NewRequest(method, url, bytes.NewBuffer(reqBody))
	if err != nil {
		return 0, err
	}

	// set auth according to mailchimp docs..
	req.SetBasicAuth("anystring", m.Config.APIKey)

	// set content type
	req.Header.Set("Content-Type", "application/json")

	// do the request
	resp, err := m.httpClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return resp.StatusCode, errors.Errorf("mailchimp: failed to read response body, %v", err)
	}

	err = json.Unmarshal(respBody, &out)
	if err != nil {
		return resp.StatusCode, errors.Errorf("mailchimp: failed to unmarshal json response body, %v", err)
	}

	return resp.StatusCode, nil
}

type AddContactRequest struct {
	EmailAddress string `json:"email_address"`
	Status       string `json:"status"`
}
